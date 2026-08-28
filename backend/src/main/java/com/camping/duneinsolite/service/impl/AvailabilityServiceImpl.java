package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.AvailabilityBlockRequest;
import com.camping.duneinsolite.dto.response.AvailabilityBlockResponse;
import com.camping.duneinsolite.dto.response.AvailabilityDayResponse;
import com.camping.duneinsolite.exception.AvailabilityBlockConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.AvailabilityBlockMapper;
import com.camping.duneinsolite.model.AvailabilityBlock;
import com.camping.duneinsolite.model.ReservationTourType;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import com.camping.duneinsolite.repository.AvailabilityBlockRepository;
import com.camping.duneinsolite.repository.ReservationTourTypeRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.service.AvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read-only over reservations (via ReservationTourTypeRepository's own
 * additive query - see its doc comment), read/write only over the new
 * AvailabilityBlock table. Never calls ReservationService or
 * ReservationServiceImpl - see AvailabilityBlock's doc comment for why
 * that boundary matters here.
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
}
