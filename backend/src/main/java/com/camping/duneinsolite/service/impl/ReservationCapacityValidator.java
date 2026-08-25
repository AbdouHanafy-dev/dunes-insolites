package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.exception.CapacityExceededException;
import com.camping.duneinsolite.model.CampingSettings;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.ReservationTour;
import com.camping.duneinsolite.model.ReservationTourHebergement;
import com.camping.duneinsolite.model.ReservationTourType;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.repository.CampingSettingsRepository;
import com.camping.duneinsolite.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

// Enforces the camping's site-wide max capacity: for every night a reservation (HEBERGEMENT,
// or TOURS with a lodging component) would occupy, the combined headcount of everyone else
// already occupying that night (status CONFIRMED or CHECKED_IN) plus this reservation must not
// exceed CampingSettings.maxCapacity.
@Service
@RequiredArgsConstructor
public class ReservationCapacityValidator {

    private static final Long SETTINGS_ID = 1L;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ReservationRepository reservationRepository;
    private final CampingSettingsRepository campingSettingsRepository;

    /**
     * @param candidate           the reservation being created/updated/confirmed, with its final
     *                            dates/headcount/hebergements already applied
     * @param excludeReservationId the candidate's own persisted id to exclude from the "others"
     *                            pool (update/confirm paths); null on create
     */
    public void validate(Reservation candidate, UUID excludeReservationId) {
        Optional<CampingSettings> settings = campingSettingsRepository.findById(SETTINGS_ID);
        if (settings.isEmpty()) {
            return; // unconfigured — treat as unlimited
        }
        int maxCapacity = settings.get().getMaxCapacity();

        Map<LocalDate, Integer> candidateNights = computeNights(candidate);
        if (candidateNights.isEmpty()) {
            return; // EXTRAS, or TOURS with no lodging component — nothing to check
        }

        LocalDate rangeStart = Collections.min(candidateNights.keySet());
        LocalDate rangeEnd = Collections.max(candidateNights.keySet()).plusDays(1);

        Map<LocalDate, Integer> othersPerNight = computeOthersPerNight(rangeStart, rangeEnd, excludeReservationId);

        LocalDate worstNight = null;
        int worstRemaining = Integer.MAX_VALUE;

        for (Map.Entry<LocalDate, Integer> entry : candidateNights.entrySet()) {
            int others = othersPerNight.getOrDefault(entry.getKey(), 0);
            int total = others + entry.getValue();
            if (total > maxCapacity) {
                int remaining = maxCapacity - others;
                if (remaining < worstRemaining) {
                    worstRemaining = remaining;
                    worstNight = entry.getKey();
                }
            }
        }

        if (worstNight != null) {
            int displayRemaining = Math.max(0, worstRemaining);
            throw new CapacityExceededException(
                    "Capacité maximale atteinte pour le " + worstNight.format(DATE_FMT) +
                    " — il ne reste que " + displayRemaining +
                    " place" + (displayRemaining == 1 ? "" : "s") +
                    " disponible" + (displayRemaining == 1 ? "" : "s") + " ce jour-là."
            );
        }
    }

    private Map<LocalDate, Integer> computeNights(Reservation reservation) {
        Map<LocalDate, Integer> nights = new HashMap<>();

        if (reservation.getReservationType() == ReservationType.HEBERGEMENT) {
            // Each tourType selection is its own sub-group with its own date and headcount —
            // the reservation-level numberOfAdults/numberOfChildren is only the overall group
            // size across the whole stay, not how many people are present on any single night.
            for (ReservationTourType tt : reservation.getTourTypes()) {
                mergeSegment(nights, tt.getActivityDate(), tt.getNumberOfNights(),
                        nz(tt.getNumberOfAdults()) + nz(tt.getNumberOfChildren()));
            }
        } else if (reservation.getReservationType() == ReservationType.TOURS && !reservation.getTours().isEmpty()) {
            for (ReservationTourHebergement h : reservation.getTours().get(0).getHebergements()) {
                mergeSegment(nights, h.getActivityDate(), h.getNumberOfNights(),
                        nz(h.getNumberOfAdults()) + nz(h.getNumberOfChildren()));
            }
        }
        // EXTRAS, or TOURS with no hebergements: falls through to the empty map

        return nights;
    }

    private Map<LocalDate, Integer> computeOthersPerNight(LocalDate rangeStart, LocalDate rangeEnd,
                                                           UUID excludeReservationId) {
        Map<LocalDate, Integer> perNight = new HashMap<>();

        for (Reservation r : reservationRepository.findOccupyingHebergementOverlapping(
                rangeStart, rangeEnd, excludeReservationId)) {
            for (ReservationTourType tt : r.getTourTypes()) {
                mergeSegment(perNight, tt.getActivityDate(), tt.getNumberOfNights(),
                        nz(tt.getNumberOfAdults()) + nz(tt.getNumberOfChildren()));
            }
        }

        for (Reservation r : reservationRepository.findOccupyingTourHebergementOverlapping(
                rangeStart, rangeEnd, excludeReservationId)) {
            for (ReservationTour tour : r.getTours()) {
                for (ReservationTourHebergement h : tour.getHebergements()) {
                    mergeSegment(perNight, h.getActivityDate(), h.getNumberOfNights(),
                            nz(h.getNumberOfAdults()) + nz(h.getNumberOfChildren()));
                }
            }
        }

        return perNight;
    }

    private void mergeSegment(Map<LocalDate, Integer> nights, LocalDate activityDate,
                              Integer numberOfNights, int headcount) {
        if (activityDate == null) return;
        int span = (numberOfNights != null && numberOfNights > 0) ? numberOfNights : 1;
        for (int i = 0; i < span; i++) {
            nights.merge(activityDate.plusDays(i), headcount, Integer::sum);
        }
    }

    private static int nz(Integer value) {
        return value != null ? value : 0;
    }
}
