package com.camping.duneinsolite.dto.response;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Everything the platform holds that is the authenticated user's own personal
 * data — the machine-readable answer to a GDPR Art. 15 access / Art. 20
 * portability request. Assembled by {@code UserDataExportService} from the
 * caller's JWT subject only; it can never contain another user's data.
 *
 * <p><b>Excludes by design:</b> password / hash (held only by Keycloak, never
 * in our DB), access/refresh tokens, server secrets, internal Keycloak
 * representation, other users' data, staff-only audit fields.
 *
 * <p>Financial documents (invoices, transactions) are included because they are
 * the user's data, but note {@code docs/privacy/legal-decisions-required.md}
 * F-5.3 — they are also statutory accounting records and are <em>not</em>
 * deletable on request.
 */
public record UserDataExport(
        Instant exportedAt,
        UserResponse profile,
        List<ReservationResponse> reservations,
        List<InvoiceResponse> invoices,
        List<TransactionResponse> transactions,
        List<NotificationResponse> notifications,
        List<ReviewResponse> reviews,
        Newsletter newsletter
) {
    /** Marketing list membership for this user's email, if any. */
    public record Newsletter(boolean subscribed, LocalDateTime subscribedAt) {}
}
