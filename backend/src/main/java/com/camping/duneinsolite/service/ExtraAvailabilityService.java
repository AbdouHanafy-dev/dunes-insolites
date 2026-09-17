package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.ActivityUnavailableException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.observability.AvailabilityMetrics;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.ReservationExtraRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Truthful, concurrency-safe activity-unit availability (quads, camel-ride
 * seats...) - the exact twin of {@link AccommodationAvailabilityService},
 * keyed on one calendar day rather than a night range since an activity has
 * no check-in/check-out span.
 *
 * <p>Deliberately keyed on {@code (extraId, date)} only, not a time slot -
 * no time-slot concept is persisted anywhere today (the vitrine's
 * "timeSlot" field is a free-text preference note, never checked against
 * capacity). Adding a real slot dimension later is a mechanical extension
 * of this key, not a redesign.
 *
 * <p>Two entry points, same contract as the accommodation service:
 * <ul>
 *   <li>{@link #status} — advisory, read-only, NO lock. May be stale by the
 *       time the guest submits.</li>
 *   <li>{@link #allocate} — authoritative. Takes a {@code FOR UPDATE} lock on
 *       the activity row, re-counts consuming units inside that lock, and
 *       throws if the request would exceed {@code maxUnitsPerDay}. Runs
 *       inside the caller's reservation-creation transaction
 *       ({@code MANDATORY}), so the lock is held until that transaction
 *       commits — the check→persist window cannot be raced.</li>
 * </ul>
 *
 * <p>When {@code maxUnitsPerDay} is null (inventory not configured) both are
 * no-ops on capacity: status is UNKNOWN, allocate does nothing — no fake
 * number is invented. A deactivated activity is always UNAVAILABLE
 * regardless of capacity.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExtraAvailabilityService {

    private final ExtraRepository extraRepository;
    private final ReservationExtraRepository reservationExtraRepository;
    private final AvailabilityMetrics metrics;
    private final Clock clock;

    public enum Status { AVAILABLE, UNAVAILABLE, UNKNOWN }

    public record Availability(Status status, Integer unitsAvailable) {}

    /** Advisory only — no lock, may be stale. */
    @Transactional(readOnly = true)
    public Availability status(Extra extra, LocalDate date) {
        if (!Boolean.TRUE.equals(extra.getIsActive())) {
            return new Availability(Status.UNAVAILABLE, 0);
        }
        if (extra.getMaxUnitsPerDay() == null) {
            metrics.checkUnknown();
            return new Availability(Status.UNKNOWN, null);
        }
        long consuming = reservationExtraRepository.sumConsumingQuantity(
                extra.getExtraId(), date, now(), null);
        int free = (int) Math.max(0, extra.getMaxUnitsPerDay() - consuming);
        if (free > 0) {
            metrics.checkAvailable();
            return new Availability(Status.AVAILABLE, free);
        }
        metrics.checkUnavailable();
        return new Availability(Status.UNAVAILABLE, 0);
    }

    public Availability statusById(UUID extraId, LocalDate date) {
        Extra extra = extraRepository.findById(extraId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found: " + extraId));
        return status(extra, date);
    }

    /**
     * Authoritative allocation check. MUST be called inside the transaction
     * that will persist the reservation — the {@code FOR UPDATE} lock on the
     * activity row is held until that transaction commits.
     *
     * @throws ActivityUnavailableException if {@code quantity} cannot be
     *         allocated for {@code date} (sold out, or the activity was
     *         deactivated)
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void allocate(UUID extraId, int quantity, LocalDate date, UUID excludeReservationId) {
        Extra extra = extraRepository.lockById(extraId)
                .orElseThrow(() -> new ResourceNotFoundException("Activity not found: " + extraId));

        if (!Boolean.TRUE.equals(extra.getIsActive())) {
            metrics.allocationRejected();
            throw new ActivityUnavailableException(
                    "\"" + extra.getName() + "\" is no longer available.");
        }
        if (extra.getMaxUnitsPerDay() == null) {
            return; // inventory not configured — no ceiling to enforce
        }

        long consuming = reservationExtraRepository.sumConsumingQuantity(
                extra.getExtraId(), date, now(), excludeReservationId);

        if (consuming + quantity > extra.getMaxUnitsPerDay()) {
            metrics.allocationRejected();
            long free = Math.max(0, extra.getMaxUnitsPerDay() - consuming);
            throw new ActivityUnavailableException(free == 0
                    ? "\"" + extra.getName() + "\" is fully booked for that date."
                    : "Only " + free + " × \"" + extra.getName() + "\" left for that date.");
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}
