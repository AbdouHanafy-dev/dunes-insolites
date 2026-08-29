package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.AccountActionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A one-time, expiring link sent by email — "verify your address" or
 * "reset your password". One table for both actions rather than two near-
 * identical ones: same shape (a random opaque token, an expiry, a
 * single-use guard), only the enum and what redeeming it does differ.
 *
 * `token` is a high-entropy random string generated with SecureRandom
 * (AccountActionServiceImpl.generateToken()), not a UUID — java.util.UUID
 * does not guarantee a CSPRNG source across JVMs, and this value is a
 * bearer credential mailed in plain text: anyone who guesses or intercepts
 * it can act as the account holder until it expires or is used.
 */
@Entity
@Table(name = "account_action_tokens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AccountActionToken {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "token_id", updatable = false, nullable = false)
    private UUID tokenId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private AccountActionType type;

    @Column(name = "token", nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    // Null = still redeemable. Set once, never cleared — a token is
    // single-use by design, not reusable until it expires.
    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
