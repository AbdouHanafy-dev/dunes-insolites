package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.AccommodationUnavailableException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.observability.AvailabilityMetrics;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.ReservationTourTypeRepository;
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
 * Truthful, concurrency-safe accommodation-unit availability (Phase 2).
 *
 * <p>Two entry points:
 * <ul>
 *   <li>{@link #status} — advisory, read-only, NO lock. Powers the public
 *       availability endpoint. May be stale by the time the guest submits.</li>
 *   <li>{@link #allocate} — authoritative. Takes a {@code FOR UPDATE} lock on
 *       the tier row, re-counts consuming units inside that lock, and throws if
 *       the request would exceed {@code maxUnits}. Runs inside the caller's
 *       reservation-creation transaction ({@code MANDATORY}), so the lock is
 *       held until that transaction commits — the check→persist window cannot
 *       be raced.</li>
 * </ul>
 *
 * <p>When {@code maxUnits} is null (inventory not configured) both are no-ops:
 * status is UNKNOWN, allocate does nothing. No fake number is invented.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccommodationAvailabilityService {

    private final AccommodationTypeRepository accommodationTypeRepository;
    private final ReservationTourTypeRepository reservationTourTypeRepository;
    private final AvailabilityMetrics metrics;
    private final Clock clock;

    public enum Status { AVAILABLE, UNAVAILABLE, UNKNOWN }

    public record Availability(Status status, Integer unitsAvailable) {}

    /** Advisory only — no lock, may be stale. */
    @Transactional(readOnly = true)
    public Availability status(AccommodationType acc, LocalDate checkIn, LocalDate checkOut) {
        if (!acc.isBookable()) {
            return new Availability(Status.UNAVAILABLE, 0);
        }
        if (acc.getMaxUnits() == null) {
            metrics.checkUnknown();
            return new Availability(Status.UNKNOWN, null);
        }
        long consuming = reservationTourTypeRepository.sumConsumingUnits(
                acc.getId(), checkIn, checkOut, now(), null);
        int free = (int) Math.max(0, acc.getMaxUnits() - consuming);
        if (free > 0) {
            metrics.checkAvailable();
            return new Availability(Status.AVAILABLE, free);
        }
        metrics.checkUnavailable();
        return new Availability(Status.UNAVAILABLE, 0);
    }

    public Availability statusById(UUID accommodationTypeId, LocalDate checkIn, LocalDate checkOut) {
        AccommodationType acc = accommodationTypeRepository.findById(accommodationTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation not found: " + accommodationTypeId));
        return status(acc, checkIn, checkOut);
    }

    /**
     * Authoritative allocation check. MUST be called inside the transaction that
     * will persist the reservation — the {@code FOR UPDATE} lock on the tier row
     * is held until that transaction commits.
     *
     * @throws AccommodationUnavailableException if {@code units} cannot be
     *         allocated for [{@code checkIn}, {@code checkOut})
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void allocate(UUID accommodationTypeId, int units, LocalDate checkIn, LocalDate checkOut,
                         UUID excludeReservationId) {
        AccommodationType acc = accommodationTypeRepository.lockById(accommodationTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation not found: " + accommodationTypeId));

        if (acc.getMaxUnits() == null) {
            return; // inventory not configured — no ceiling to enforce
        }

        long consuming = reservationTourTypeRepository.sumConsumingUnits(
                acc.getId(), checkIn, checkOut, now(), excludeReservationId);

        if (consuming + units > acc.getMaxUnits()) {
            metrics.allocationRejected();
            long free = Math.max(0, acc.getMaxUnits() - consuming);
            throw new AccommodationUnavailableException(free == 0
                    ? "\"" + acc.getName() + "\" is fully booked for those nights."
                    : "Only " + free + " × \"" + acc.getName() + "\" left for those nights.");
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}
