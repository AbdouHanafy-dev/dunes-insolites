package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.AccountActionToken;
import com.camping.duneinsolite.model.enums.AccountActionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountActionTokenRepository extends JpaRepository<AccountActionToken, UUID> {

    Optional<AccountActionToken> findByToken(String token);

    // Invalidating a user's older, still-unused tokens of the same type
    // when a new one is issued - requesting a second password reset email
    // should not leave the first link still live.
    List<AccountActionToken> findAllByUser_UserIdAndTypeAndUsedAtIsNull(UUID userId, AccountActionType type);
}
