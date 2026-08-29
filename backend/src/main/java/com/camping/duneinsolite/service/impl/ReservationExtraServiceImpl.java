package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.CurrencyConfig;
import com.camping.duneinsolite.dto.request.ReservationExtraRequest;
import com.camping.duneinsolite.dto.response.ReservationExtraResponse;
import com.camping.duneinsolite.dto.response.ReservationExtrasListResponse;
import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.ReservationExtraMapper;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.ReservationExtra;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.UserProductRemise;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.ReservationExtraRepository;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.service.ReservationExtraService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ReservationExtraServiceImpl implements ReservationExtraService {

    private final ReservationExtraRepository reservationExtraRepository;
    private final ReservationRepository reservationRepository;
    private final ExtraRepository extraRepository;          // ← catalog
    private final ReservationExtraMapper reservationExtraMapper;
    private final CurrencyConfig currencyConfig;

    /**
     * Scenario 2 — Client adds an extra to an already existing reservation.
     * Looks up catalog by extraId, snapshots name/description/duration/unitPrice.
     */
    @Override
    public ReservationExtraResponse createExtra(ReservationExtraRequest request) {
        if (request.getReservationId() == null) {
            throw new ReservationValidationException("reservationId is required when adding an extra to an existing reservation");
        }

        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + request.getReservationId()));

        Extra catalog = extraRepository.findById(request.getExtraId())
                .orElseThrow(() -> new ResourceNotFoundException("Extra not found in catalog: " + request.getExtraId()));

        validateExtraActivityDate(request.getActivityDate(), reservation);

        LocalDate activityDate = request.getActivityDate();
        if (activityDate == null && (reservation.getReservationType() == ReservationType.EXTRAS
                || reservation.getReservationType() == ReservationType.TOURS)) {
            activityDate = reservation.getServiceDate();
        }

        // Convert the catalog (TND) price into the reservation's own currency, same as the
        // other two extra-adding flows in ReservationServiceImpl. Uses the reservation's own
        // locked-in rate (if it has one) so this stays consistent even if the live config
        // rate changes later.
        double rate = currencyConfig.effectiveRate(reservation);

        double unitPrice = r2(catalog.getUnitPrice() / rate);

        User user = reservation.getUser();
        UserProductRemise remise = user.getRemises().stream()
                .filter(r -> r.getProductId().equals(catalog.getExtraId()))
                .findFirst().orElse(null);
        if (remise != null && remise.getUnitRemise() != null) {
            unitPrice = Math.max(0, r2(unitPrice - remise.getUnitRemise() / rate));
        }

        double totalExtraPrice = r2(unitPrice * request.getQuantity());

        ReservationExtra extra = ReservationExtra.builder()
                .reservation(reservation)
                .catalogExtraId(catalog.getExtraId())
                .name(catalog.getName())
                .description(catalog.getDescription())
                .duration(catalog.getDuration())
                .quantity(request.getQuantity())
                .unitPrice(unitPrice)
                .totalPrice(totalExtraPrice)
                .activityDate(activityDate)
                .tva(catalog.getTva())
                .isActive(true)
                .build();

        ReservationExtra saved = reservationExtraRepository.save(extra);

        // Update totalExtrasAmount on the reservation
        double currentExtrasTotal = reservation.getTotalExtrasAmount() != null
                ? reservation.getTotalExtrasAmount() : 0.0;
        reservation.setTotalExtrasAmount(currentExtrasTotal + totalExtraPrice);
        reservationRepository.save(reservation);

        return reservationExtraMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationExtraResponse getExtraById(UUID extraId) {
        return reservationExtraMapper.toResponse(findById(extraId));
    }

    // Was an unbounded findAll() (ARCHITECTURE.md §13 item 15) - every extra
    // ever attached to any reservation, loaded in one request. Not consumed
    // by the admin app yet (no frontend reference to this endpoint found),
    // so paginating it now has no existing caller to coordinate with.
    @Override
    @Transactional(readOnly = true)
    public Page<ReservationExtraResponse> getAllExtras(Pageable pageable) {
        return reservationExtraRepository.findAll(pageable)
                .map(reservationExtraMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationExtrasListResponse getExtrasByReservation(UUID reservationId) {
        List<ReservationExtraResponse> extras = reservationExtraRepository
                .findByReservationReservationId(reservationId).stream()
                .map(reservationExtraMapper::toResponse)
                .toList();

        double totalExtrasAmount = extras.stream()
                .mapToDouble(e -> e.getTotalPrice() != null ? e.getTotalPrice() : 0.0)
                .sum();

        return new ReservationExtrasListResponse(extras, totalExtrasAmount);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationExtraResponse> getActiveExtras() {
        return reservationExtraRepository.findByIsActiveTrue().stream()
                .map(reservationExtraMapper::toResponse).toList();
    }

    /**
     * Quantity and activityDate are updatable after booking — name/price are snapshots.
     */
    @Override
    public ReservationExtraResponse updateExtra(UUID extraId, ReservationExtraRequest request) {
        ReservationExtra extra = findById(extraId);
        if (request.getActivityDate() != null) {
            validateExtraActivityDate(request.getActivityDate(), extra.getReservation());
            extra.setActivityDate(request.getActivityDate());
        }
        extra.setQuantity(request.getQuantity());
        return reservationExtraMapper.toResponse(reservationExtraRepository.save(extra));
    }

    @Override
    public void deleteExtra(UUID extraId) {
        ReservationExtra extra = findById(extraId);

        // Update reservation's totalExtrasAmount before deleting
        Reservation reservation = extra.getReservation();
        double currentTotal = reservation.getTotalExtrasAmount() != null
                ? reservation.getTotalExtrasAmount() : 0.0;
        reservation.setTotalExtrasAmount(
                Math.max(0.0, currentTotal - extra.getTotalPrice())
        );
        reservationRepository.save(reservation);
        reservationExtraRepository.delete(extra);
    }

    private static double r2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private ReservationExtra findById(UUID extraId) {
        return reservationExtraRepository.findById(extraId)
                .orElseThrow(() -> new ResourceNotFoundException("ReservationExtra not found: " + extraId));
    }

    private void validateExtraActivityDate(LocalDate activityDate, Reservation reservation) {
        ReservationType type = reservation.getReservationType();
        if (type == ReservationType.EXTRAS || type == ReservationType.TOURS) {
            // activityDate is optional for EXTRAS and TOURS — defaults to serviceDate if null
            return;
        }
        if (activityDate == null) {
            throw new ReservationValidationException("Activity date is required for each extra");
        }
        if (type == ReservationType.HEBERGEMENT) {
            LocalDate checkIn  = reservation.getCheckInDate();
            LocalDate checkOut = reservation.getCheckOutDate();
            if (activityDate.isBefore(checkIn) || activityDate.isAfter(checkOut)) {
                throw new ReservationValidationException(
                    "Extra activity date (" + activityDate + ") must be between check-in (" + checkIn + ") and check-out (" + checkOut + ")");
            }
        } else if (type == ReservationType.TOURS) {
            LocalDate serviceDate = reservation.getServiceDate();
            if (activityDate.isBefore(serviceDate)) {
                throw new ReservationValidationException(
                    "Extra activity date (" + activityDate + ") must be on or after the tour departure date (" + serviceDate + ")");
            }
        }
    }
}