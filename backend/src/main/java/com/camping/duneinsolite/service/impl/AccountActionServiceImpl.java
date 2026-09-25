package com.camping.duneinsolite.service.impl;

import static com.camping.duneinsolite.observability.LogSanitizer.maskEmail;
import com.camping.duneinsolite.exception.InvalidTokenException;
import com.camping.duneinsolite.model.AccountActionToken;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.MailLocale;
import com.camping.duneinsolite.model.enums.AccountActionType;
import com.camping.duneinsolite.repository.AccountActionTokenRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.AccountActionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

/**
 * Both "verify your email" and "forgot your password" are the same shape —
 * mail a one-time link, redeem it once, act on Keycloak — so they share one
 * service and one token table (AccountActionToken) rather than two parallel
 * implementations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountActionServiceImpl implements AccountActionService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AccountActionTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final Keycloak keycloak;
    private final EmailService emailService;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${app.frontend.url:https://duneinsolite.com}")
    private String frontendUrl;

    @Override
    @Transactional
    public void sendVerificationEmail(User user, String locale) {
        invalidateExisting(user, AccountActionType.EMAIL_VERIFY);
        String token = issueToken(user, AccountActionType.EMAIL_VERIFY, Duration.ofHours(24));
        String link = frontendUrl + "/verify-email?token=" + token;
        emailService.sendVerificationEmail(user.getEmail(), user.getName(), link, MailLocale.from(locale));
    }

    @Override
    @Transactional
    public void requestPasswordReset(String email, String locale) {
        userRepository.findByEmail(email).ifPresent(user -> {
            invalidateExisting(user, AccountActionType.PASSWORD_RESET);
            // 1 hour, not 24 - a live password-reset link is a stronger
            // bearer credential than an email-verify one (it can take over
            // the account outright), so it gets a shorter window.
            String token = issueToken(user, AccountActionType.PASSWORD_RESET, Duration.ofHours(1));
            String link = frontendUrl + "/reset-password?token=" + token;
            emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), link, MailLocale.from(locale));
        });
        // No else branch, no exception, nothing that would tell a caller
        // whether `email` belongs to a real account - see the interface doc.
    }

    @Override
    @Transactional
    public void sendPasswordSetupInvitation(User user) {
        invalidateExisting(user, AccountActionType.PASSWORD_RESET);
        String token = issueToken(user, AccountActionType.PASSWORD_RESET, Duration.ofHours(24));
        String link = frontendUrl + "/reset-password?token=" + token;
        emailService.sendDriverInvitationEmail(user.getEmail(), user.getName(), link);
    }

    @Override
    @Transactional
    public void sendGuestPasswordSetupInvitation(User user, String locale) {
        invalidateExisting(user, AccountActionType.PASSWORD_RESET);
        String token = issueToken(user, AccountActionType.PASSWORD_RESET, Duration.ofHours(24));
        String link = frontendUrl + "/reset-password?token=" + token;
        emailService.sendGuestAccountInvitationEmail(user.getEmail(), user.getName(), link, MailLocale.from(locale));
    }

    @Override
    @Transactional
    public void verifyEmail(String token) {
        AccountActionToken accountToken = redeem(token, AccountActionType.EMAIL_VERIFY);
        User user = accountToken.getUser();

        UserRepresentation keycloakUser = keycloak.realm(realm).users().get(user.getUserId().toString())
                .toRepresentation();
        keycloakUser.setEmailVerified(true);
        keycloak.realm(realm).users().get(user.getUserId().toString()).update(keycloakUser);
        log.info("Email verified for user {}", maskEmail(user.getEmail()));
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        AccountActionToken accountToken = redeem(token, AccountActionType.PASSWORD_RESET);
        User user = accountToken.getUser();

        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(newPassword);
        credential.setTemporary(false);

        keycloak.realm(realm).users().get(user.getUserId().toString()).resetPassword(credential);
        log.info("Password reset for user {}", maskEmail(user.getEmail()));
    }

    // ── helpers ──────────────────────────────────────────────────────

    private String issueToken(User user, AccountActionType type, Duration validFor) {
        String token = generateToken();
        AccountActionToken accountToken = AccountActionToken.builder()
                .user(user)
                .type(type)
                .token(token)
                .expiresAt(LocalDateTime.now().plus(validFor))
                .build();
        tokenRepository.save(accountToken);
        return token;
    }

    // A stale, still-unused link from an earlier request should stop
    // working the moment a fresh one is issued - otherwise both stay live
    // simultaneously, which is more surface than a "the latest email wins"
    // model needs.
    private void invalidateExisting(User user, AccountActionType type) {
        List<AccountActionToken> existing = tokenRepository
                .findAllByUser_UserIdAndTypeAndUsedAtIsNull(user.getUserId(), type);
        LocalDateTime now = LocalDateTime.now();
        existing.forEach(t -> t.setUsedAt(now));
        tokenRepository.saveAll(existing);
    }

    private AccountActionToken redeem(String token, AccountActionType expectedType) {
        AccountActionToken accountToken = tokenRepository.findByToken(token)
                .orElseThrow(InvalidTokenException::new);
        if (accountToken.getType() != expectedType
                || accountToken.getUsedAt() != null
                || accountToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidTokenException();
        }
        accountToken.setUsedAt(LocalDateTime.now());
        tokenRepository.save(accountToken);
        return accountToken;
    }

    /** 32 random bytes, hex-encoded - 64 characters, ~256 bits of entropy. */
    private String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}
