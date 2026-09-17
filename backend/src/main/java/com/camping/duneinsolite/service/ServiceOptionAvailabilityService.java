package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.exception.ServiceOptionUnavailableException;
import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.observability.AvailabilityMetrics;
import com.camping.duneinsolite.repository.ReservationServiceOptionRepository;
import com.camping.duneinsolite.repository.ServiceOptionRepository;
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
 * Truthful, concurrency-safe guide/transport capacity - the exact twin of
 * {@link ExtraAvailabilityService}, keyed on {@code (serviceOptionId, date)}.
 *
 * <p>Two entry points, same contract as the accommodation/extra services:
 * <ul>
 *   <li>{@link #status} — advisory, read-only, NO lock.</li>
 *   <li>{@link #allocate} — authoritative. {@code FOR UPDATE} lock, re-counts
 *       inside the lock, MANDATORY propagation so it runs inside the
 *       caller's reservation transaction.</li>
 * </ul>
 *
 * <p>{@code maxUnitsPerDay} null → no ceiling, both are no-ops on capacity.
 * A deactivated option is always UNAVAILABLE regardless of capacity.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ServiceOptionAvailabilityService {

    private final ServiceOptionRepository serviceOptionRepository;
    private final ReservationServiceOptionRepository reservationServiceOptionRepository;
    private final AvailabilityMetrics metrics;
    private final Clock clock;

    public enum Status { AVAILABLE, UNAVAILABLE, UNKNOWN }

    public record Availability(Status status, Integer unitsAvailable) {}

    @Transactional(readOnly = true)
    public Availability status(ServiceOption option, LocalDate date) {
        if (!option.isActive()) {
            return new Availability(Status.UNAVAILABLE, 0);
        }
        if (option.getMaxUnitsPerDay() == null) {
            metrics.checkUnknown();
            return new Availability(Status.UNKNOWN, null);
        }
        long consuming = reservationServiceOptionRepository.sumConsumingQuantity(
                option.getId(), date, now(), null);
        int free = (int) Math.max(0, option.getMaxUnitsPerDay() - consuming);
        if (free > 0) {
            metrics.checkAvailable();
            return new Availability(Status.AVAILABLE, free);
        }
        metrics.checkUnavailable();
        return new Availability(Status.UNAVAILABLE, 0);
    }

    public Availability statusById(UUID serviceOptionId, LocalDate date) {
        ServiceOption option = serviceOptionRepository.findById(serviceOptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Service option not found: " + serviceOptionId));
        return status(option, date);
    }

    /**
     * Authoritative allocation check. MUST be called inside the transaction
     * that will persist the reservation.
     *
     * @throws ServiceOptionUnavailableException if {@code quantity} cannot be
     *         allocated for {@code date}
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void allocate(UUID serviceOptionId, int quantity, LocalDate date, UUID excludeReservationId) {
        ServiceOption option = serviceOptionRepository.lockById(serviceOptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Service option not found: " + serviceOptionId));

        if (!option.isActive()) {
            metrics.allocationRejected();
            throw new ServiceOptionUnavailableException(
                    "\"" + option.getName() + "\" is no longer available.");
        }
        if (option.getMaxUnitsPerDay() == null) {
            return; // inventory not configured — no ceiling to enforce
        }

        long consuming = reservationServiceOptionRepository.sumConsumingQuantity(
                option.getId(), date, now(), excludeReservationId);

        if (consuming + quantity > option.getMaxUnitsPerDay()) {
            metrics.allocationRejected();
            long free = Math.max(0, option.getMaxUnitsPerDay() - consuming);
            throw new ServiceOptionUnavailableException(free == 0
                    ? "\"" + option.getName() + "\" is fully booked for that date."
                    : "Only " + free + " × \"" + option.getName() + "\" left for that date.");
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}
