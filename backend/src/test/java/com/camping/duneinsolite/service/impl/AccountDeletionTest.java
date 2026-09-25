package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.model.DeletedAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Deleting an account must not be blocked by its reservations (they are detached), but must
 * never orphan an invoice or a payment.
 */
class AccountDeletionTest {

    private final UUID userId = UUID.randomUUID();
    private JdbcTemplate jdbc;
    private AccountDeletion deletion;

    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        deletion = new AccountDeletion(jdbc);
        stubCount("FROM invoices", 0);
        stubCount("FROM transactions", 0);
        when(jdbc.update(eq("UPDATE reservations SET user_id = ? WHERE user_id = ?"), eq(DeletedAccount.USER_ID), eq(userId)))
                .thenReturn(3);
    }

    private void stubCount(String fragment, int value) {
        when(jdbc.queryForObject(contains(fragment), eq(Integer.class), eq(userId))).thenReturn(value);
    }

    @Test
    void reservationsAreDetachedToThePlaceholder_notBlocking() {
        int detached = deletion.detachAndClean(userId);

        assertThat(detached).isEqualTo(3);
        verify(jdbc).update("UPDATE reservations SET user_id = ? WHERE user_id = ?", DeletedAccount.USER_ID, userId);
    }

    @Test
    void personalRowsAreDropped_andDriverLinksAreCleared() {
        deletion.detachAndClean(userId);

        verify(jdbc).update(startsWith("DELETE FROM reviews"), eq(userId));
        verify(jdbc).update(startsWith("DELETE FROM user_product_remises"), eq(userId));
        verify(jdbc).update(startsWith("DELETE FROM driver_profiles"), eq(userId));
        verify(jdbc).update(contains("SET driver_user_id = NULL"), eq(userId));
        // The trips keep the driver's name: the profile link is nulled BEFORE the profile is deleted.
        InOrder order = inOrder(jdbc);
        order.verify(jdbc).update(contains("SET driver_profile_id = NULL"), eq(userId));
        order.verify(jdbc).update(startsWith("DELETE FROM driver_profiles"), eq(userId));
    }

    @Test
    void anAccountWithInvoicesIsRefusedAndNothingIsChanged() {
        stubCount("FROM invoices", 1);

        assertThatThrownBy(() -> deletion.detachAndClean(userId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("1 invoice(s)")
                .hasMessageContaining("accounting");

        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void anAccountWithPaymentsIsRefused() {
        stubCount("FROM transactions", 2);

        assertThatThrownBy(() -> deletion.detachAndClean(userId))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("2 payment(s)");
        verify(jdbc, never()).update(eq("UPDATE reservations SET user_id = ? WHERE user_id = ?"), eq(DeletedAccount.USER_ID), eq(userId));
    }

    @Test
    void thePlaceholderItselfCanNeverBeDeleted() {
        assertThatThrownBy(() -> deletion.detachAndClean(DeletedAccount.USER_ID))
                .isInstanceOf(ConflictException.class);
        verifyNoInteractions(jdbc);
    }

    @Test
    void aGuideProfileIsUnlinkedFromItsAssignments() {
        UUID guideProfileId = UUID.randomUUID();
        deletion.detachGuideProfile(guideProfileId);
        verify(jdbc).update("UPDATE guides SET guide_profile_id = NULL WHERE guide_profile_id = ?", guideProfileId);
    }
}
