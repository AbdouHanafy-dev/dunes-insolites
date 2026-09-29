package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.AvailabilityBlockRequest;
import com.camping.duneinsolite.dto.request.ExternalAccommodationBookingRequest;
import com.camping.duneinsolite.dto.response.AccommodationInventoryResponse;
import com.camping.duneinsolite.dto.response.AvailabilityBlockResponse;
import com.camping.duneinsolite.dto.response.AvailabilityDayResponse;
import com.camping.duneinsolite.dto.response.ExternalAccommodationBookingResponse;
import com.camping.duneinsolite.exception.AccommodationUnavailableException;
import com.camping.duneinsolite.exception.AvailabilityBlockConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.AvailabilityBlockMapper;
import com.camping.duneinsolite.model.AvailabilityBlock;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.ExternalAccommodationBooking;
import com.camping.duneinsolite.model.ReservationTourType;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import com.camping.duneinsolite.repository.AvailabilityBlockRepository;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.ExternalAccommodationBookingRepository;
import com.camping.duneinsolite.repository.InventoryRuleRepository;
import com.camping.duneinsolite.repository.ReservationTourTypeRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.service.AvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Operations view over internal reservations, manual closures, physical
 * accommodation stock and bookings entered from external sales channels.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AvailabilityServiceImpl implements AvailabilityService {

    // A block/pending reservation still holds the slot from an ops
    // standpoint; only these two are truly "not happening".
    private static final EnumSet<ReservationStatus> EXCLUDED_FROM_OCCUPANCY =
            EnumSet.of(ReservationStatus.CANCELLED, ReservationStatus.REJECTED);

    private final AvailabilityBlockRepository availabilityBlockRepository;
    private final AccommodationTypeRepository accommodationTypeRepository;
    private final ExternalAccommodationBookingRepository externalBookingRepository;
    private final InventoryRuleRepository inventoryRuleRepository;
    private final ReservationTourTypeRepository reservationTourTypeRepository;
    private final TourTypeRepository tourTypeRepository;
    private final AvailabilityBlockMapper availabilityBlockMapper;

    @Override
    @Transactional(readOnly = true)
    public List<AvailabilityDayResponse> getCalendar(UUID tourTypeId, YearMonth month) {
        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();

        List<ReservationTourType> lines = reservationTourTypeRepository
                .findActiveByTourTypeAndDateRange(tourTypeId, start, end, EXCLUDED_FROM_OCCUPANCY);

        Map<LocalDate, AvailabilityDayResponse> byDate = new HashMap<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            AvailabilityDayResponse day = new AvailabilityDayResponse();
            day.setDate(d);
            byDate.put(d, day);
        }

        for (ReservationTourType line : lines) {
            if (line.getActivityDate() == null) continue;
            AvailabilityDayResponse day = byDate.get(line.getActivityDate());
            if (day == null) continue; // defensive - BETWEEN already bounds this
            day.setReservationCount(day.getReservationCount() + 1);
            day.setAdults(day.getAdults() + (line.getNumberOfAdults() != null ? line.getNumberOfAdults() : 0));
            day.setChildren(day.getChildren() + (line.getNumberOfChildren() != null ? line.getNumberOfChildren() : 0));
        }

        for (AvailabilityBlock block : availabilityBlockRepository
                .findByTourTypeTourTypeIdAndDateBetween(tourTypeId, start, end)) {
            AvailabilityDayResponse day = byDate.get(block.getDate());
            if (day == null) continue;
            day.setBlockId(block.getAvailabilityBlockId());
            day.setBlockNote(block.getNote());
        }

        List<AccommodationType> accommodationTypes =
                accommodationTypeRepository.findByTourType_TourTypeIdOrderByDisplayOrderAsc(tourTypeId);
        List<ExternalAccommodationBooking> externalBookings =
                externalBookingRepository.findForCalendar(tourTypeId, start, end.plusDays(1));
        LocalDateTime now = LocalDateTime.now();

        for (AvailabilityDayResponse day : byDate.values()) {
            List<AccommodationInventoryResponse> inventory = accommodationTypes.stream().map(acc -> {
                int internal = (int) reservationTourTypeRepository.sumConsumingUnitsOnNight(
                        acc.getId(), day.getDate(), now, null);
                List<ExternalAccommodationBookingResponse> externalForDay = externalBookings.stream()
                        .filter(booking -> booking.getAccommodationType().getId().equals(acc.getId()))
                        .filter(booking -> !booking.getCheckIn().isAfter(day.getDate())
                                && booking.getCheckOut().isAfter(day.getDate()))
                        .map(ExternalAccommodationBookingResponse::from)
                        .toList();
                int external = externalForDay.stream().mapToInt(ExternalAccommodationBookingResponse::units).sum();
                Integer effectiveMax = inventoryRuleRepository.findCoveringAccommodation(acc.getId(), day.getDate())
                        .stream().findFirst().map(com.camping.duneinsolite.model.InventoryRule::getMaxUnits)
                        .orElse(acc.getMaxUnits());
                Integer available = effectiveMax == null
                        ? null
                        : Math.max(0, effectiveMax - internal - external);
                String status = inventoryStatus(effectiveMax, available);
                return new AccommodationInventoryResponse(acc.getId(), acc.getName(), effectiveMax,
                        internal, external, available, status, externalForDay);
            }).toList();
            day.setAccommodations(inventory);
        }

        return byDate.values().stream()
                .sorted((a, b) -> a.getDate().compareTo(b.getDate()))
                .toList();
    }

    @Override
    public AvailabilityBlockResponse createBlock(AvailabilityBlockRequest request) {
        TourType tourType = tourTypeRepository.findById(request.getTourTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("TourType not found: " + request.getTourTypeId()));

        availabilityBlockRepository.findByTourTypeTourTypeIdAndDate(request.getTourTypeId(), request.getDate())
                .ifPresent(existing -> {
                    throw new AvailabilityBlockConflictException(
                            "This tour type is already blocked on " + request.getDate() + ".");
                });

        AvailabilityBlock block = AvailabilityBlock.builder()
                .tourType(tourType)
                .date(request.getDate())
                .note(request.getNote())
                .build();

        return availabilityBlockMapper.toResponse(availabilityBlockRepository.save(block));
    }

    @Override
    public void deleteBlock(UUID blockId) {
        AvailabilityBlock block = availabilityBlockRepository.findById(blockId)
                .orElseThrow(() -> new ResourceNotFoundException("Availability block not found: " + blockId));
        availabilityBlockRepository.delete(block);
    }

    @Override
    public ExternalAccommodationBookingResponse createExternalBooking(
            ExternalAccommodationBookingRequest request) {
        AccommodationType accommodation = accommodationTypeRepository.lockById(request.getAccommodationTypeId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Accommodation not found: " + request.getAccommodationTypeId()));
        if (accommodation.getMaxUnits() == null) {
            throw new IllegalArgumentException("Configure the accommodation unit stock before adding an external booking.");
        }

        LocalDateTime now = LocalDateTime.now();
        for (LocalDate night = request.getCheckIn(); night.isBefore(request.getCheckOut()); night = night.plusDays(1)) {
            long internal = reservationTourTypeRepository.sumConsumingUnitsOnNight(
                    accommodation.getId(), night, now, null);
            long external = externalBookingRepository.sumUnitsOnNight(accommodation.getId(), night, null);
            long free = Math.max(0, accommodation.getMaxUnits() - internal - external);
            if (request.getUnits() > free) {
                throw new AccommodationUnavailableException(
                        "Only " + free + " unit(s) of \"" + accommodation.getName()
                                + "\" remain on " + night + ".");
            }
        }

        ExternalAccommodationBooking booking = ExternalAccommodationBooking.builder()
                .accommodationType(accommodation)
                .checkIn(request.getCheckIn())
                .checkOut(request.getCheckOut())
                .units(request.getUnits())
                .source(request.getSource())
                .externalReference(blankToNull(request.getExternalReference()))
                .note(blankToNull(request.getNote()))
                .build();
        return ExternalAccommodationBookingResponse.from(externalBookingRepository.save(booking));
    }

    @Override
    public void deleteExternalBooking(UUID bookingId) {
        ExternalAccommodationBooking booking = externalBookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("External booking not found: " + bookingId));
        externalBookingRepository.delete(booking);
    }

    private static String inventoryStatus(Integer maxUnits, Integer available) {
        if (maxUnits == null || available == null) return "UNKNOWN";
        if (available == 0) return "FULL";
        if (maxUnits > 0 && available * 4 <= maxUnits) return "LOW";
        return "AVAILABLE";
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
