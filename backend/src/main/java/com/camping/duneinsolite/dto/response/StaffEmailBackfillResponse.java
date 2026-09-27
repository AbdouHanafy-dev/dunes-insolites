package com.camping.duneinsolite.dto.response;

/**
 * The result of sending the team's "confirmed" traceability e-mail for reservations that were
 * already confirmed before this feature existed. {@code considered} is how many matched
 * (confirmed/checked-in/completed site bookings); {@code sent} is how many actually got a fresh
 * e-mail - the rest were skipped, most often because a later run already sent theirs
 * (idempotent through {@code email_dispatch}, so calling this again is always safe).
 */
public record StaffEmailBackfillResponse(int considered, int sent) {}
