package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.PromoCodeRequest;
import com.camping.duneinsolite.dto.response.PromoCodeCheckResponse;
import com.camping.duneinsolite.dto.response.PromoCodeResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.PromoCode;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.PromoCodeRepository;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.service.PromoCodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PromoCodeServiceImpl implements PromoCodeService {

    /** The statuses that count towards what a partner is owed. */
    static final Set<ReservationStatus> COUNTED =
            Set.of(ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.COMPLETED);

    private final PromoCodeRepository promoCodeRepository;
    private final ReservationRepository reservationRepository;

    @Override
    @Transactional(readOnly = true)
    public Optional<PromoCode> resolveForBooking(String typedCode, ReservationType type) {
        if (typedCode == null || typedCode.isBlank()) return Optional.empty();
        if (type != ReservationType.TOURS) {
            throw new ReservationValidationException("Promo codes apply to circuits only.");
        }
        PromoCode code = promoCodeRepository.findByCodeIgnoreCase(typedCode.trim())
                .filter(c -> c.isUsableOn(LocalDate.now()))
                .orElseThrow(() -> new ReservationValidationException("This promo code is not valid."));
        return Optional.of(code);
    }

    @Override
    @Transactional(readOnly = true)
    public PromoCodeCheckResponse check(String typedCode) {
        if (typedCode == null || typedCode.isBlank()) return new PromoCodeCheckResponse(false, null);
        return promoCodeRepository.findByCodeIgnoreCase(typedCode.trim())
                .filter(c -> c.isUsableOn(LocalDate.now()))
                .map(c -> new PromoCodeCheckResponse(true, c.getDiscountPercent()))
                .orElse(new PromoCodeCheckResponse(false, null));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PromoCodeResponse> listWithStats() {
        return promoCodeRepository.findAll().stream()
                .sorted((a, b) -> a.getPartnerName().compareToIgnoreCase(b.getPartnerName()))
                .map(this::withStats)
                .toList();
    }

    @Override
    @Transactional
    public PromoCodeResponse create(PromoCodeRequest request) {
        String code = normalize(request.getCode());
        if (promoCodeRepository.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("Ce code promo existe déjà.");
        }
        PromoCode saved = promoCodeRepository.save(fill(new PromoCode(), request, code));
        return withStats(saved);
    }

    @Override
    @Transactional
    public PromoCodeResponse update(UUID id, PromoCodeRequest request) {
        PromoCode existing = promoCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promo code not found: " + id));
        String code = normalize(request.getCode());
        boolean renamed = !existing.getCode().equalsIgnoreCase(code);
        if (renamed && promoCodeRepository.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("Ce code promo existe déjà.");
        }
        if (renamed && !bookings(existing.getCode()).isEmpty()) {
            // Past bookings carry the code as text: renaming would cut them off from this code's figures.
            throw new ConflictException("Ce code a déjà des réservations : désactivez-le et créez-en un autre.");
        }
        return withStats(promoCodeRepository.save(fill(existing, request, code)));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        PromoCode existing = promoCodeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Promo code not found: " + id));
        if (!bookings(existing.getCode()).isEmpty()) {
            throw new ConflictException("Ce code a déjà des réservations : désactivez-le au lieu de le supprimer.");
        }
        promoCodeRepository.delete(existing);
    }

    private static String normalize(String raw) {
        return raw.trim().toUpperCase(Locale.ROOT);
    }

    private PromoCode fill(PromoCode target, PromoCodeRequest request, String code) {
        if (request.getDiscountPercent() == null) {
            throw new ReservationValidationException("Discount is required.");
        }
        if (request.getValidFrom() != null && request.getValidUntil() != null
                && request.getValidUntil().isBefore(request.getValidFrom())) {
            throw new ReservationValidationException("The end date is before the start date.");
        }
        target.setCode(code);
        target.setPartnerName(request.getPartnerName().trim());
        target.setDiscountPercent(request.getDiscountPercent());
        target.setCommissionPercent(request.getCommissionPercent());
        target.setValidFrom(request.getValidFrom());
        target.setValidUntil(request.getValidUntil());
        target.setActive(request.getActive() == null || request.getActive());
        return target;
    }

    private List<Reservation> bookings(String code) {
        return reservationRepository.findByPromoCodeIgnoreCase(code);
    }

    private PromoCodeResponse withStats(PromoCode code) {
        long counted = 0;
        long pending = 0;
        BigDecimal revenue = Money.ZERO;
        BigDecimal discount = Money.ZERO;
        for (Reservation r : bookings(code.getCode())) {
            if (r.getStatus() == ReservationStatus.PENDING) {
                pending++;
            } else if (COUNTED.contains(r.getStatus())) {
                counted++;
                revenue = Money.add(revenue, Money.nz(r.getTotalAmount()));
                discount = Money.add(discount, r.promoDiscountAmount());
            }
        }
        BigDecimal commission = code.getCommissionPercent() == null ? null
                : Money.multiply(revenue, code.getCommissionPercent().movePointLeft(2));
        return PromoCodeResponse.builder()
                .promoCodeId(code.getPromoCodeId())
                .code(code.getCode())
                .partnerName(code.getPartnerName())
                .discountPercent(code.getDiscountPercent())
                .commissionPercent(code.getCommissionPercent())
                .validFrom(code.getValidFrom())
                .validUntil(code.getValidUntil())
                .active(code.isActive())
                .reservations(counted)
                .pendingReservations(pending)
                .circuitRevenue(revenue)
                .discountGiven(discount)
                .commissionDue(commission)
                .build();
    }
}
