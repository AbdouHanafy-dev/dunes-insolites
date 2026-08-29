package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.RegisterRequest;
import com.camping.duneinsolite.dto.request.UserProductRemiseRequest;
import com.camping.duneinsolite.dto.request.UserRequest;
import com.camping.duneinsolite.exception.EmailAlreadyInUseException;
import com.camping.duneinsolite.exception.ExternalServiceException;
import com.camping.duneinsolite.exception.KeycloakSyncException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.exception.TermsNotAcceptedException;
import com.camping.duneinsolite.exception.UserNotFoundException;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.UserProductRemise;
import com.camping.duneinsolite.model.enums.LoyaltyTier;
import com.camping.duneinsolite.model.enums.ProductType;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.AccountActionTokenRepository;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.NotificationRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.repository.UserProductRemiseRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.impl.EmailService;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class KeycloakUserSyncService {

    private final Keycloak keycloak;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final UserProductRemiseRepository remiseRepository;
    private final TourTypeRepository tourTypeRepository;
    private final TourRepository tourRepository;
    private final ExtraRepository extraRepository;
    private final EntityManager entityManager;
    private final AccountActionTokenRepository accountActionTokenRepository;
    private final NotificationRepository notificationRepository;

    @Value("${keycloak.realm}")
    private String realm;

    // ─────────────────────────────────────────────────────────────────────
    // REGISTRATION (password supplied by whoever is registering)
    // Called from POST /api/auth/register — always as CLIENT — and from the
    // seeder, which is trusted server-side code and may ask for other roles.
    //
    // The role is a PARAMETER, never a field on RegisterRequest. The register
    // endpoint is permitAll(), so a caller-supplied role would let anyone on
    // the internet grant themselves ADMIN.
    // ─────────────────────────────────────────────────────────────────────

    @Transactional
    public User registerUser(RegisterRequest request, UserRole role) {
        // Server-enforced, not just a frontend checkbox - see
        // TermsNotAcceptedException. Scoped to CLIENT specifically: the only
        // other caller is Seed.java, which only ever registers ADMIN/CAMPING
        // accounts (trusted server-side code, never went through a public
        // consent checkbox to begin with), so this can never wrongly block it.
        if (role == UserRole.CLIENT && !request.isAcceptedTerms()) {
            throw new TermsNotAcceptedException();
        }

        // Reject duplicates BEFORE touching Keycloak. @Transactional rolls back
        // Postgres but has no authority over Keycloak, so creating there first
        // would leave an orphaned, role-bearing account behind on every retry.
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyInUseException(request.getEmail());
        }

        // Password comes from the request — user chose it themselves.
        // emailVerified=false here (unlike the other two callers below) -
        // self-registration is the one path where AccountActionServiceImpl
        // actually mails a real verify link afterward (see AuthController);
        // it does not gate login, so this is a trust signal, not an access
        // gate - see EmailService.sendVerificationEmail's own comment.
        String keycloakUserId = createKeycloakUser(
                request.getEmail(),
                request.getName(),
                request.getPassword(),
                false
        );

        assignRole(keycloakUserId, role.name());

        User user = User.builder()
                .userId(UUID.fromString(keycloakUserId))
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(role)
                .loyaltyPoints(0)
                .loyaltyTier(LoyaltyTier.BRONZE)
                // PARTENAIRE fields
                .matriculeFiscal(role == UserRole.PARTENAIRE ? request.getMatriculeFiscal() : null)
                .agencyAddress(role   == UserRole.PARTENAIRE ? request.getAgencyAddress()   : null)
                .termsAcceptedAt(role == UserRole.CLIENT ? LocalDateTime.now() : null)
                .build();

        User savedUser = userRepository.save(user);
        log.info("User {} registered and saved with id {}", request.getEmail(), savedUser.getUserId());
        return savedUser;
    }

    // ─────────────────────────────────────────────────────────────────────
    // GUEST CHECKOUT (vitrine booking, no login step)
    // Called from PublicBookingServiceImpl. Reuses an existing account by
    // email if one exists (returning guest, or an already-registered user);
    // otherwise creates a CLIENT account with a random password the guest
    // never sees - the booking flow itself needs no password.
    // ─────────────────────────────────────────────────────────────────────

    @Transactional
    public User findOrCreateGuestUser(String name, String email, String phone) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            String keycloakUserId = createKeycloakUser(email, name, generateSecurePassword(), true);
            assignRole(keycloakUserId, UserRole.CLIENT.name());

            User user = User.builder()
                    .userId(UUID.fromString(keycloakUserId))
                    .name(name)
                    .email(email)
                    .phone(phone)
                    .role(UserRole.CLIENT)
                    .loyaltyPoints(0)
                    .loyaltyTier(LoyaltyTier.BRONZE)
                    .build();

            User savedUser = userRepository.save(user);
            log.info("Guest booking created account for {} with id {}", email, savedUser.getUserId());
            return savedUser;
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ADMIN-CREATED USER (admin fills a form, password is generated)
    // Called from POST /api/users/add
    // ─────────────────────────────────────────────────────────────────────

    // Found live (exception-handling audit): both checks below used to run
    // AFTER createKeycloakUser, so a duplicate email or - more commonly - a
    // remise exceeding the catalog price threw only once a real Keycloak
    // identity already existed. @Transactional rolls back the Postgres
    // side, but has no authority over Keycloak - the account was left
    // behind for real, with a generated password nobody has, findable by
    // nothing in this app since no User row ever existed for it. Same
    // "reject duplicates BEFORE touching Keycloak" reasoning registerUser's
    // own comment already states; this method just wasn't following it for
    // either check. Verified live: reproduced the orphan (a real Keycloak
    // user existed with no matching Postgres row after a remise-exceeds-
    // price failure), fixed this, confirmed the same request no longer
    // creates anything in Keycloak when it fails validation.
    @Transactional
    public User adminCreateUser(UserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyInUseException(request.getEmail());
        }

        boolean hasRemise = Boolean.TRUE.equals(request.getHasSpecialRemise());
        if (hasRemise && request.getRemises() != null) {
            validateRemisePrices(request.getRemises(), request.getRole() == UserRole.PARTENAIRE);
        }

        String generatedPassword = generateSecurePassword();
        log.info("Generated temporary password for new user {}", request.getEmail());

        String keycloakUserId = createKeycloakUser(
                request.getEmail(),
                request.getName(),
                generatedPassword,
                true
        );

        assignRole(keycloakUserId, request.getRole().name());

        User user = User.builder()
                .userId(UUID.fromString(keycloakUserId))
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(request.getRole())
                .loyaltyPoints(0)
                .loyaltyTier(LoyaltyTier.BRONZE)
                .matriculeFiscal(request.getRole() == UserRole.PARTENAIRE ? request.getMatriculeFiscal() : null)
                .agencyAddress(request.getRole()   == UserRole.PARTENAIRE ? request.getAgencyAddress()   : null)
                .hasSpecialRemise(hasRemise)
                .build();

        User savedUser = userRepository.save(user);
        log.info("User {} created and saved with id {}", request.getEmail(), savedUser.getUserId());

        if (hasRemise && request.getRemises() != null && !request.getRemises().isEmpty()) {
            saveRemises(savedUser, request.getRemises(), request.getRole());
        }

        // ── Send welcome email with generated password ──
       // emailService.sendWelcomeEmail(request.getEmail(), request.getName(), generatedPassword);

        return reloadWithRemises(savedUser);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DELETE USER (Keycloak + local DB)
    // ─────────────────────────────────────────────────────────────────────

    // Found live (relational-integrity audit): this used to delete from
    // Keycloak FIRST, then Postgres - and every one of the ~10 tables that
    // reference users.user_id (reservations, invoices, reviews, remises,
    // notifications, account_action_tokens...) has a plain NO ACTION FK,
    // no cascade. Deleting a user who has any of those failed the Postgres
    // delete with a raw constraint violation - after Keycloak's delete had
    // already gone through and cannot be rolled back. Net effect: a real,
    // broken half-deleted account - locked out of login, but still a full
    // row in Postgres with their reservation/data intact and now orphaned
    // from anything that identifies them by login. Reproduced live: a
    // throwaway account with one reservation, deleted via the real
    // endpoint, ended up exactly in that state, confirmed in both
    // Keycloak and Postgres directly.
    //
    // Fixed by reordering: Postgres first, with an explicit flush() so the
    // FK violation (if any) surfaces immediately, before Keycloak is ever
    // touched. A rejected delete now leaves the account exactly as it
    // was - nothing removed anywhere - instead of removed from one system
    // and stranded in the other. See GlobalExceptionHandler's new
    // DataIntegrityViolationException/Hibernate ConstraintViolationException
    // handlers for the other half of this: the caller gets a clean 409,
    // not a raw SQL-flavored 500 (found and fixed both exception shapes -
    // the direct EntityManager.flush() below bypasses Spring's exception
    // translation, so the raw Hibernate type reaches the client
    // untranslated unless something maps it explicitly).
    //
    // account_action_tokens and notifications are cleaned up first,
    // deliberately - every self-registered user has at least one token
    // (the verification email sent at signup), so leaving that table as a
    // hard block would mean literally no self-registered account could
    // ever be deleted. Neither table carries audit/financial weight the
    // way a reservation or invoice does, so cascading them here (rather
    // than blocking on them) is the correct call - real business records
    // still block the delete exactly as before.
    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        accountActionTokenRepository.deleteAllByUser_UserId(userId);
        notificationRepository.deleteAllByUser_UserId(userId);
        userRepository.delete(user);
        entityManager.flush();

        List<UserRepresentation> keycloakUsers = keycloak.realm(realm)
                .users()
                .searchByEmail(user.getEmail(), true);

        if (!keycloakUsers.isEmpty()) {
            keycloak.realm(realm)
                    .users()
                    .get(keycloakUsers.get(0).getId())
                    .remove();
            log.info("User {} deleted from Keycloak", user.getEmail());
        }

        log.info("User {} deleted from local DB", user.getEmail());
    }

    // ─────────────────────────────────────────────────────────────────────
    // UPDATE ROLE (Keycloak + local DB)
    // ─────────────────────────────────────────────────────────────────────

    @Transactional
    public User updateUserRole(UUID userId, UserRole newRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        List<UserRepresentation> keycloakUsers = keycloak.realm(realm)
                .users()
                .searchByEmail(user.getEmail(), true);

        if (!keycloakUsers.isEmpty()) {
            String keycloakUserId = keycloakUsers.get(0).getId();
            RealmResource realmResource = keycloak.realm(realm);

            try {
                RoleRepresentation oldRole = realmResource.roles()
                        .get(user.getRole().name())
                        .toRepresentation();
                realmResource.users().get(keycloakUserId)
                        .roles().realmLevel().remove(List.of(oldRole));
            } catch (Exception e) {
                log.warn("Could not remove old role: {}", e.getMessage());
            }

            try {
                RoleRepresentation role = realmResource.roles()
                        .get(newRole.name())
                        .toRepresentation();
                realmResource.users().get(keycloakUserId)
                        .roles().realmLevel().add(List.of(role));
                log.info("User {} role updated to {} in Keycloak", user.getEmail(), newRole);
            } catch (Exception e) {
                log.warn("Could not assign new role: {}", e.getMessage());
            }
        }

        user.setRole(newRole);
        return userRepository.save(user);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Splits the app's single `name` field into Keycloak's firstName/lastName.
     * Keycloak's default User Profile config marks lastName required; without
     * it, direct-grant login fails with "Account is not fully set up" (found
     * live: VERIFY_PROFILE kicks in on a missing required attribute even
     * though nothing surfaces at registration time - user creation succeeds,
     * only login fails). The domain model (User, RegisterRequest, UserRequest)
     * deliberately has no separate lastName field, so it's derived here
     * instead of plumbing a second field through every DTO.
     */
    private void applyName(UserRepresentation keycloakUser, String name) {
        String[] parts = name.trim().split("\\s+", 2);
        keycloakUser.setFirstName(parts[0]);
        keycloakUser.setLastName(parts.length > 1 ? parts[1] : parts[0]);
    }

    /**
     * Creates a user in Keycloak and returns the new Keycloak user ID.
     * Throws if user already exists (409) or creation fails.
     *
     * emailVerified is a parameter, not hardcoded: self-registration wants
     * it false (a real verify email follows - see AuthController /
     * AccountActionServiceImpl); guest checkout and admin-created accounts
     * keep the previous unconditional true, since neither of those flows
     * ever sends the guest/staff a link to click.
     */
    private String createKeycloakUser(String email, String name, String password, boolean emailVerified) {
        RealmResource realmResource = keycloak.realm(realm);
        UsersResource usersResource = realmResource.users();

        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(password);
        credential.setTemporary(false); // true = user must change password on first login

        UserRepresentation keycloakUser = new UserRepresentation();
        keycloakUser.setUsername(email);
        keycloakUser.setEmail(email);
        applyName(keycloakUser, name);
        keycloakUser.setEnabled(true);
        keycloakUser.setEmailVerified(emailVerified);
        keycloakUser.setCredentials(List.of(credential));

        Response response = usersResource.create(keycloakUser);
        int status = response.getStatus();

        if (status == 409) {
            throw new EmailAlreadyInUseException(email);
        }
        if (status != 201) {
            String body = response.readEntity(String.class);
            // The specific status/body is Keycloak's own response detail -
            // logged here, not put in the exception message a client sees
            // (ExternalServiceException's own doc comment on why).
            log.error("Keycloak user creation failed for {} - status {}: {}", email, status, body);
            throw new ExternalServiceException("Keycloak", null);
        }

        String locationHeader = response.getHeaderString("Location");
        String keycloakUserId = locationHeader.substring(locationHeader.lastIndexOf("/") + 1);
        log.info("User {} created in Keycloak with id {}", email, keycloakUserId);
        return keycloakUserId;
    }

    /**
     * Assigns a realm role to a Keycloak user.
     * Auto-creates the role in Keycloak if it doesn't exist yet.
     */
    private void assignRole(String keycloakUserId, String roleName) {
        RealmResource realmResource = keycloak.realm(realm);
        try {
            List<RoleRepresentation> availableRoles = realmResource.roles().list();
            boolean roleExists = availableRoles.stream()
                    .anyMatch(r -> r.getName().equals(roleName));

            if (!roleExists) {
                RoleRepresentation newRole = new RoleRepresentation();
                newRole.setName(roleName);
                newRole.setDescription("Auto-created role for " + roleName);
                realmResource.roles().create(newRole);
                log.info("Role {} auto-created in Keycloak realm", roleName);
            }

            RoleRepresentation role = realmResource.roles()
                    .get(roleName)
                    .toRepresentation();

            realmResource.users()
                    .get(keycloakUserId)
                    .roles()
                    .realmLevel()
                    .add(List.of(role));

            log.info("Role {} assigned to user {} in Keycloak", roleName, keycloakUserId);
        } catch (Exception e) {
            log.warn("Could not assign role {} to user {}: {}", roleName, keycloakUserId, e.getMessage());
        }
    }

    /**
     * Generates a cryptographically secure random password.
     * Format: 3 uppercase + 3 lowercase + 3 digits + 3 special chars, shuffled.
     * Always satisfies common password policy requirements.
     */
    private String generateSecurePassword() {
        SecureRandom random = new SecureRandom();
        String upper   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lower   = "abcdefghijklmnopqrstuvwxyz";
        String digits  = "0123456789";
        String special = "!@#$%&*";
        String all     = upper + lower + digits + special;

        StringBuilder sb = new StringBuilder();
        // Guarantee at least one of each required category
        sb.append(upper.charAt(random.nextInt(upper.length())));
        sb.append(upper.charAt(random.nextInt(upper.length())));
        sb.append(lower.charAt(random.nextInt(lower.length())));
        sb.append(lower.charAt(random.nextInt(lower.length())));
        sb.append(digits.charAt(random.nextInt(digits.length())));
        sb.append(digits.charAt(random.nextInt(digits.length())));
        sb.append(special.charAt(random.nextInt(special.length())));
        sb.append(special.charAt(random.nextInt(special.length())));
        // Fill remaining length
        for (int i = 8; i < 12; i++) {
            sb.append(all.charAt(random.nextInt(all.length())));
        }
        // Shuffle to avoid predictable pattern
        char[] chars = sb.toString().toCharArray();
        for (int i = chars.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp;
        }
        return new String(chars);
    }

    @Transactional
    public User updateUser(UUID userId, UserRequest request) {

        // ── 1. Fetch existing user ──────────────────────────────────────────
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        // ── 2. Email uniqueness check (only if email is being changed) ──────
        if (!user.getEmail().equalsIgnoreCase(request.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new EmailAlreadyInUseException(request.getEmail());
            }
        }

        // ── 3. Keycloak update ──────────────────────────────────────────────
        List<UserRepresentation> keycloakUsers = keycloak.realm(realm)
                .users()
                .searchByEmail(user.getEmail(), true); // search by OLD email

        if (!keycloakUsers.isEmpty()) {
            String keycloakUserId = keycloakUsers.get(0).getId();
            RealmResource realmResource = keycloak.realm(realm);

            // 3a. Update profile fields
            try {
                UserRepresentation keycloakUser = keycloakUsers.get(0);
                applyName(keycloakUser, request.getName());
                keycloakUser.setEmail(request.getEmail());
              //  keycloakUser.setUsername(request.getEmail()); // keep username = email
                keycloakUser.setEmailVerified(true);          // prevent 400 on email update
                keycloakUser.setEnabled(true);                // ensure user stays active
                keycloakUser.setRequiredActions(List.of());   // clear VERIFY_EMAIL etc.
                realmResource.users().get(keycloakUserId).update(keycloakUser);
                log.info("Keycloak profile updated for user {}", userId);

            } catch (jakarta.ws.rs.WebApplicationException e) {
                // Extract real Keycloak error body for debugging
                String keycloakError;
                try {
                    e.getResponse().bufferEntity();
                    keycloakError = e.getResponse().readEntity(String.class);
                } catch (Exception ignored) {
                    keycloakError = e.getMessage();
                }

                log.error("Keycloak rejected profile update for user {} — HTTP {}: {}",
                        userId, e.getResponse().getStatus(), keycloakError);

                if (e.getResponse().getStatus() == 409) {
                    throw new EmailAlreadyInUseException(request.getEmail());
                }
                throw new KeycloakSyncException(
                        "Keycloak error (" + e.getResponse().getStatus() + "): " + keycloakError, e);
            }

            // 3b. Update password only if explicitly provided
            if (request.getPassword() != null && !request.getPassword().isBlank()) {
                try {
                    CredentialRepresentation credential = new CredentialRepresentation();
                    credential.setType(CredentialRepresentation.PASSWORD);
                    credential.setValue(request.getPassword());
                    credential.setTemporary(false);
                    realmResource.users().get(keycloakUserId).resetPassword(credential);
                    log.info("Password updated for user {} in Keycloak", userId);
                } catch (Exception e) {
                    throw new KeycloakSyncException(
                            "Failed to update password in Keycloak for user: " + userId, e);
                }
            }

            // 3c. Update role only if it actually changed
            if (!user.getRole().equals(request.getRole())) {

                // Remove old role
                try {
                    RoleRepresentation oldRole = realmResource.roles()
                            .get(user.getRole().name())
                            .toRepresentation();
                    realmResource.users()
                            .get(keycloakUserId)
                            .roles()
                            .realmLevel()
                            .remove(List.of(oldRole));
                    log.info("Old role {} removed from user {} in Keycloak",
                            user.getRole(), userId);
                } catch (jakarta.ws.rs.NotFoundException e) {
                    log.warn("Old role {} not found in Keycloak realm — skipping removal",
                            user.getRole().name());
                } catch (Exception e) {
                    log.warn("Could not remove old role {} from user {}: {}",
                            user.getRole(), userId, e.getMessage());
                }

                // Assign new role
                try {
                    assignRole(keycloakUserId, request.getRole().name());
                    log.info("New role {} assigned to user {} in Keycloak",
                            request.getRole(), userId);
                } catch (Exception e) {
                    throw new KeycloakSyncException(
                            "Failed to assign role " + request.getRole()
                                    + " in Keycloak for user: " + userId, e);
                }
            }

        } else {
            // User exists in DB but not in Keycloak — log and continue
            log.warn("User {} (ID: {}) not found in Keycloak — skipping Keycloak update",
                    user.getEmail(), userId);
        }

        // ── 4. Local DB update ──────────────────────────────────────────────
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setRole(request.getRole());

        if (request.getRole() == UserRole.PARTENAIRE) {
            user.setMatriculeFiscal(request.getMatriculeFiscal());
            user.setAgencyAddress(request.getAgencyAddress());
        } else {
            // Clear partner-only fields if role changed away from PARTENAIRE
            user.setMatriculeFiscal(null);
            user.setAgencyAddress(null);
        }

        boolean hasRemise = Boolean.TRUE.equals(request.getHasSpecialRemise());
        user.setHasSpecialRemise(hasRemise);

        // Clear and replace remises
        remiseRepository.deleteAllByUser_UserId(user.getUserId());
        if (hasRemise && request.getRemises() != null && !request.getRemises().isEmpty()) {
            saveRemises(user, request.getRemises(), request.getRole());
        }

        userRepository.save(user);
        log.info("User {} (ID: {}) updated successfully in DB", user.getEmail(), userId);

        // ── 5. Return fresh entity with remises loaded from DB ──────────────
        return reloadWithRemises(user);
    }

    // ─────────────────────────────────────────────────────────────────────
    // REMISE HELPERS
    // ─────────────────────────────────────────────────────────────────────

    // Found live (CRUD audit): findByIdWithRemises's own JOIN FETCH query
    // (see UserRepository) is supposed to return the just-saved user with
    // its remises populated, but within the same transaction Hibernate's
    // first-level cache returns the SAME managed User instance it already
    // has by id - and that instance's `remises` collection was already
    // initialized (empty, from the entity's own construction/save) before
    // the remises were separately persisted via remiseRepository.save().
    // A JOIN FETCH does not re-populate a collection Hibernate already
    // considers initialized, so the response came back with remises: []
    // even though the rows really were in Postgres (confirmed directly -
    // this was a stale in-memory read, not a lost write). detach() forces
    // the next findByIdWithRemises call to treat the id as unseen and
    // genuinely re-query, JOIN FETCH included. flush() must run first: the
    // remise inserts from saveRemises() are still only pending in the
    // persistence context here (JpaRepository.save() does not guarantee an
    // immediate flush), each referencing this exact `user` Java instance -
    // detaching it before those inserts are actually sent makes
    // Hibernate's auto-flush treat that reference as unresolvable
    // ("references an unsaved transient instance") the moment the
    // findByIdWithRemises query below triggers one. Found live wiring this
    // fix in the first place (a real 500), not assumed.
    private User reloadWithRemises(User user) {
        entityManager.flush();
        entityManager.detach(user);
        return userRepository.findByIdWithRemises(user.getUserId()).orElseThrow();
    }

    // Validation-only pass, no persistence - lets callers fail fast before
    // creating anything in Keycloak (see adminCreateUser's own comment on
    // why that ordering matters). saveRemises below repeats the same
    // catalog lookups and comparisons when it actually persists; a second
    // cheap read of a handful of rows is a fine price for never orphaning
    // a Keycloak identity on a rejected remise.
    private void validateRemisePrices(List<UserProductRemiseRequest> remiseRequests, boolean isPartner) {
        for (UserProductRemiseRequest req : remiseRequests) {
            if (req.getProductType() == ProductType.TOURTYPE) {
                var tt = tourTypeRepository.findById(req.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("TourType not found: " + req.getProductId()));
                double maxAdult = isPartner ? tt.getPartnerAdultPrice() : tt.getPassengerAdultPrice();
                double maxChild = isPartner ? tt.getPartnerChildPrice() : tt.getPassengerChildPrice();
                double adultR = req.getAdultRemise() != null ? req.getAdultRemise() : 0.0;
                double childR = req.getChildRemise() != null ? req.getChildRemise() : 0.0;
                if (adultR > maxAdult) throw new IllegalArgumentException(
                        "Adult remise " + adultR + " exceeds price " + maxAdult + " for TourType " + tt.getName());
                if (childR > maxChild) throw new IllegalArgumentException(
                        "Child remise " + childR + " exceeds price " + maxChild + " for TourType " + tt.getName());

            } else if (req.getProductType() == ProductType.TOUR) {
                var tour = tourRepository.findById(req.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Tour not found: " + req.getProductId()));
                double maxAdult = isPartner ? tour.getPartnerAdultPrice() : tour.getPassengerAdultPrice();
                double maxChild = isPartner ? tour.getPartnerChildPrice() : tour.getPassengerChildPrice();
                double adultR = req.getAdultRemise() != null ? req.getAdultRemise() : 0.0;
                double childR = req.getChildRemise() != null ? req.getChildRemise() : 0.0;
                if (adultR > maxAdult) throw new IllegalArgumentException(
                        "Adult remise " + adultR + " exceeds price " + maxAdult + " for Tour " + tour.getName());
                if (childR > maxChild) throw new IllegalArgumentException(
                        "Child remise " + childR + " exceeds price " + maxChild + " for Tour " + tour.getName());

            } else if (req.getProductType() == ProductType.EXTRA) {
                var extra = extraRepository.findById(req.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Extra not found: " + req.getProductId()));
                double unitR = req.getUnitRemise() != null ? req.getUnitRemise() : 0.0;
                if (unitR > extra.getUnitPrice()) throw new IllegalArgumentException(
                        "Unit remise " + unitR + " exceeds price " + extra.getUnitPrice() + " for Extra " + extra.getName());
            }
        }
    }

    private void saveRemises(User user, List<UserProductRemiseRequest> remiseRequests, UserRole role) {
        boolean isPartner = role == UserRole.PARTENAIRE;

        for (UserProductRemiseRequest req : remiseRequests) {
            UserProductRemise.UserProductRemiseBuilder builder = UserProductRemise.builder()
                    .user(user)
                    .productId(req.getProductId())
                    .productType(req.getProductType())
                    .productName(req.getProductName());

            if (req.getProductType() == ProductType.TOURTYPE) {
                var tt = tourTypeRepository.findById(req.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("TourType not found: " + req.getProductId()));
                double maxAdult = isPartner ? tt.getPartnerAdultPrice() : tt.getPassengerAdultPrice();
                double maxChild = isPartner ? tt.getPartnerChildPrice() : tt.getPassengerChildPrice();
                double adultR = req.getAdultRemise() != null ? req.getAdultRemise() : 0.0;
                double childR = req.getChildRemise() != null ? req.getChildRemise() : 0.0;
                if (adultR > maxAdult) throw new IllegalArgumentException(
                        "Adult remise " + adultR + " exceeds price " + maxAdult + " for TourType " + tt.getName());
                if (childR > maxChild) throw new IllegalArgumentException(
                        "Child remise " + childR + " exceeds price " + maxChild + " for TourType " + tt.getName());
                builder.adultRemise(adultR).childRemise(childR);

            } else if (req.getProductType() == ProductType.TOUR) {
                var tour = tourRepository.findById(req.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Tour not found: " + req.getProductId()));
                double maxAdult = isPartner ? tour.getPartnerAdultPrice() : tour.getPassengerAdultPrice();
                double maxChild = isPartner ? tour.getPartnerChildPrice() : tour.getPassengerChildPrice();
                double adultR = req.getAdultRemise() != null ? req.getAdultRemise() : 0.0;
                double childR = req.getChildRemise() != null ? req.getChildRemise() : 0.0;
                if (adultR > maxAdult) throw new IllegalArgumentException(
                        "Adult remise " + adultR + " exceeds price " + maxAdult + " for Tour " + tour.getName());
                if (childR > maxChild) throw new IllegalArgumentException(
                        "Child remise " + childR + " exceeds price " + maxChild + " for Tour " + tour.getName());
                builder.adultRemise(adultR).childRemise(childR);

            } else if (req.getProductType() == ProductType.EXTRA) {
                var extra = extraRepository.findById(req.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Extra not found: " + req.getProductId()));
                double unitR = req.getUnitRemise() != null ? req.getUnitRemise() : 0.0;
                if (unitR > extra.getUnitPrice()) throw new IllegalArgumentException(
                        "Unit remise " + unitR + " exceeds price " + extra.getUnitPrice() + " for Extra " + extra.getName());
                builder.unitRemise(unitR);
            }

            remiseRepository.save(builder.build());
        }
    }
}