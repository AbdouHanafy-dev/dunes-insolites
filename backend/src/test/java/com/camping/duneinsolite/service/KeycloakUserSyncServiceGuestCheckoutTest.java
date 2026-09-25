package com.camping.duneinsolite.service;

import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.AccountActionTokenRepository;
import com.camping.duneinsolite.repository.CustomRoleRepository;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.NotificationRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.repository.UserProductRemiseRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.impl.EmailService;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.RoleMappingResource;
import org.keycloak.admin.client.resource.RoleResource;
import org.keycloak.admin.client.resource.RoleScopeResource;
import org.keycloak.admin.client.resource.RolesResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Found live (booking-flow walkthrough, 30 Aug 2026): findOrCreateGuestUser
 * generated a real Keycloak password, handed it straight to Keycloak, and
 * never told anyone what it was - not the guest, not staff - nor marked it
 * temporary, so Keycloak never demanded a change on first login. A real,
 * fully-provisioned account existed with an unknowable password. Verified
 * live against a real Keycloak instance that the fix produces
 * requiredActions: ["UPDATE_PASSWORD"]; these tests pin the same fix at the
 * unit level so it can't silently regress back to the old behavior.
 */
class KeycloakUserSyncServiceGuestCheckoutTest {

    private UserRepository userRepository;
    private EmailService emailService;
    private Keycloak keycloak;
    private RealmResource realmResource;
    private UsersResource usersResource;
    private KeycloakUserSyncService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        emailService = mock(EmailService.class);
        keycloak = mock(Keycloak.class);
        realmResource = mock(RealmResource.class);
        usersResource = mock(UsersResource.class);

        when(keycloak.realm(any())).thenReturn(realmResource);
        when(realmResource.users()).thenReturn(usersResource);

        service = new KeycloakUserSyncService(
                keycloak,
                userRepository,
                emailService,
                mock(UserProductRemiseRepository.class),
                mock(TourTypeRepository.class),
                mock(TourRepository.class),
                mock(ExtraRepository.class),
                mock(EntityManager.class),
                mock(AccountActionTokenRepository.class),
                mock(NotificationRepository.class),
                mock(CustomRoleRepository.class),
                mock(com.camping.duneinsolite.service.impl.AccountDeletion.class));
        ReflectionTestUtils.setField(service, "realm", "duneinsolite");

        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    /** Wires the create-user + assign-role fluent chain the real Keycloak
     *  admin client exposes, so createKeycloakUser/assignRole run their real
     *  logic against mocks instead of a live server. */
    private void stubSuccessfulKeycloakCreate(String keycloakUserId) {
        Response createResponse = mock(Response.class);
        when(createResponse.getStatus()).thenReturn(201);
        when(createResponse.getHeaderString("Location"))
                .thenReturn("http://kc/admin/realms/duneinsolite/users/" + keycloakUserId);
        when(usersResource.create(any(UserRepresentation.class))).thenReturn(createResponse);

        RolesResource rolesResource = mock(RolesResource.class);
        when(realmResource.roles()).thenReturn(rolesResource);
        when(rolesResource.list()).thenReturn(List.of());
        RoleResource roleResource = mock(RoleResource.class);
        when(rolesResource.get("CLIENT")).thenReturn(roleResource);
        RoleRepresentation clientRole = new RoleRepresentation();
        clientRole.setName("CLIENT");
        when(roleResource.toRepresentation()).thenReturn(clientRole);

        UserResource userResource = mock(UserResource.class);
        when(usersResource.get(keycloakUserId)).thenReturn(userResource);
        RoleMappingResource roleMappingResource = mock(RoleMappingResource.class);
        when(userResource.roles()).thenReturn(roleMappingResource);
        RoleScopeResource roleScopeResource = mock(RoleScopeResource.class);
        when(roleMappingResource.realmLevel()).thenReturn(roleScopeResource);
    }

    @Test
    void newGuestGetsAnInvitedAccountWithoutAPasswordEmail() {
        when(userRepository.existsByEmail("guest@example.com")).thenReturn(false);
        stubSuccessfulKeycloakCreate("11111111-1111-1111-1111-111111111111");

        User result = service.createInvitedGuestUser("Claude Test Guest", "guest@example.com", "+21650000000");

        assertThat(result.getRole()).isEqualTo(UserRole.CLIENT);
        assertThat(result.getEmail()).isEqualTo("guest@example.com");
        assertThat(result.getTermsAcceptedAt()).isNotNull();

        ArgumentCaptor<UserRepresentation> userCaptor = ArgumentCaptor.forClass(UserRepresentation.class);
        verify(usersResource).create(userCaptor.capture());
        List<CredentialRepresentation> credentials = userCaptor.getValue().getCredentials();
        assertThat(credentials).hasSize(1);
        // temporary=false, deliberately, NOT true. It WAS true briefly, the
        // same day - reasoned as "forces a password change on first login" -
        // but this app's login is Keycloak's direct password grant, which
        // cannot service ANY pending required action: reproduced live, a
        // real temporary=true credential made login fail with invalid_grant
        // "Account is not fully set up" for the account's own correct
        // password. Pinning false here is pinning the actual fix, not the
        // first attempt at one.
        assertThat(credentials.get(0).isTemporary()).isFalse();
        assertThat(credentials.get(0).getValue()).isNotBlank();
        verify(emailService, never()).sendWelcomeEmail(any(), any(), any());
    }

    @Test
    void existingEmailRequiresSignInAndIsNeverReusedAnonymously() {
        when(userRepository.existsByEmail("returning@example.com")).thenReturn(true);

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                service.createInvitedGuestUser("Returning Guest", "returning@example.com", "+21650000001"))
                .isInstanceOf(com.camping.duneinsolite.exception.ConflictException.class)
                .hasMessageContaining("sign in");
        // A repeat guest must never get a second Keycloak identity, a second
        // generated password, or a second welcome email - findByEmail already
        // resolved them, so nothing downstream should fire.
        verify(usersResource, never()).create(any());
        verify(emailService, never()).sendWelcomeEmail(any(), any(), any());
    }
}
