package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.model.DeletedAccount;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Everything that must happen to the rows around a person before their account or profile
 * can be deleted. Runs inside the caller's transaction (Spring JDBC shares the JPA
 * connection), so a refusal or a failure leaves nothing half-done.
 *
 * <p>The rule: what is personal goes; what the business must keep stays but no longer points
 * at the person. Reservations are re-pointed to {@link DeletedAccount}. Invoices and payments
 * are the accounting record and are never orphaned: an account that has any cannot be deleted.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AccountDeletion {

    private final JdbcTemplate jdbc;

    /**
     * Prepares {@code userId} for deletion, or refuses.
     *
     * @return how many reservations were detached from the account
     * @throws ConflictException when the account has invoices or payments, or is the placeholder
     */
    public int detachAndClean(UUID userId) {
        if (DeletedAccount.USER_ID.equals(userId)) {
            throw new ConflictException("This is the system account that holds reservations of deleted customers. It cannot be deleted.");
        }

        int invoices = count("SELECT count(*) FROM invoices WHERE user_id = ?", userId);
        int payments = count("SELECT count(*) FROM transactions t JOIN reservations r "
                + "ON r.reservation_id = t.reservation_id WHERE r.user_id = ?", userId);
        if (invoices > 0 || payments > 0) {
            throw new ConflictException("This account has " + invoices + " invoice(s) and " + payments
                    + " payment(s). They must be kept for accounting, so the account cannot be deleted. "
                    + "Deactivate it instead, or delete those records first if they are test data.");
        }

        // A driver account: keep the trip assignments (they hold the driver's name), drop the link.
        jdbc.update("UPDATE chauffeurs SET driver_profile_id = NULL WHERE driver_profile_id IN "
                + "(SELECT driver_profile_id FROM driver_profiles WHERE user_id = ?)", userId);
        jdbc.update("UPDATE chauffeurs SET driver_user_id = NULL WHERE driver_user_id = ?", userId);
        jdbc.update("DELETE FROM driver_profiles WHERE user_id = ?", userId);

        int reservations = jdbc.update("UPDATE reservations SET user_id = ? WHERE user_id = ?",
                DeletedAccount.USER_ID, userId);

        // Purely personal: nothing the business has to keep.
        jdbc.update("DELETE FROM reviews WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM user_product_remises WHERE user_id = ?", userId);

        log.info("account {} prepared for deletion: {} reservation(s) detached", userId, reservations);
        return reservations;
    }

    /** A guide profile: assignments on reservations keep the guide's name, they only lose the link. */
    public void detachGuideProfile(UUID guideProfileId) {
        jdbc.update("UPDATE guides SET guide_profile_id = NULL WHERE guide_profile_id = ?", guideProfileId);
    }

    private int count(String sql, UUID userId) {
        Integer n = jdbc.queryForObject(sql, Integer.class, userId);
        return n == null ? 0 : n;
    }
}
