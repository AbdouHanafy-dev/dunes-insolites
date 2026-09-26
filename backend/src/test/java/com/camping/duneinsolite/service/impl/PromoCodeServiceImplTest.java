package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.PromoCodeRequest;
import com.camping.duneinsolite.dto.response.PromoCodeResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ReservationValidationException;
import com.camping.duneinsolite.model.PromoCode;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.ReservationTour;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import com.camping.duneinsolite.model.enums.ReservationType;
import com.camping.duneinsolite.repository.PromoCodeRepository;
import com.camping.duneinsolite.repository.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PromoCodeServiceImplTest {

    private PromoCodeRepository codes;
    private ReservationRepository reservations;
    private PromoCodeServiceImpl service;

    @BeforeEach
    void setUp() {
        codes = mock(PromoCodeRepository.class);
        reservations = mock(ReservationRepository.class);
        service = new PromoCodeServiceImpl(codes, reservations);
    }

    private static PromoCode badira() {
        return PromoCode.builder().code("BADIRA10").partnerName("Hôtel Badira")
                .discountPercent(new BigDecimal("10")).commissionPercent(new BigDecimal("5")).active(true).build();
    }

    /** A circuit booking whose circuits cost {@code before}, with the promo already granted. */
    private static Reservation booking(String before, ReservationStatus status, String discountPercent) {
        ReservationTour tour = new ReservationTour();
        tour.setTotalPrice(new BigDecimal(before));
        Reservation r = Reservation.builder().reservationType(ReservationType.TOURS).status(status)
                .promoCode("BADIRA10")
                .promoDiscountPercent(discountPercent == null ? null : new BigDecimal(discountPercent)).build();
        r.addTour(tour);
        r.setTotalAmount(r.calculateTotalToursAmount());
        return r;
    }

    @Test
    void aCodeTypedInAnyCaseIsFoundAndSavedUpperCase() {
        PromoCodeRequest request = new PromoCodeRequest();
        request.setCode(" badira10 ");
        request.setPartnerName("Hôtel Badira");
        request.setDiscountPercent(new BigDecimal("10"));
        when(codes.existsByCodeIgnoreCase("BADIRA10")).thenReturn(false);
        when(codes.save(any(PromoCode.class))).thenAnswer(inv -> inv.getArgument(0));

        PromoCodeResponse saved = service.create(request);

        assertThat(saved.getCode()).isEqualTo("BADIRA10");
        assertThat(saved.getCommissionPercent()).isNull();
        assertThat(saved.getCommissionDue()).isNull();
    }

    @Test
    void aCodeThatAlreadyExistsIsRefused() {
        PromoCodeRequest request = new PromoCodeRequest();
        request.setCode("badira10");
        request.setPartnerName("x");
        request.setDiscountPercent(BigDecimal.TEN);
        when(codes.existsByCodeIgnoreCase("BADIRA10")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request)).isInstanceOf(ConflictException.class);
        verify(codes, never()).save(any());
    }

    @Test
    void anUnknownExpiredOrSwitchedOffCodeIsRefusedForABooking() {
        PromoCode expired = badira();
        expired.setValidUntil(LocalDate.now().minusDays(1));
        PromoCode off = badira();
        off.setActive(false);

        when(codes.findByCodeIgnoreCase("NOPE")).thenReturn(Optional.empty());
        when(codes.findByCodeIgnoreCase("OLD")).thenReturn(Optional.of(expired));
        when(codes.findByCodeIgnoreCase("OFF")).thenReturn(Optional.of(off));

        for (String typed : List.of("NOPE", "OLD", "OFF")) {
            assertThatThrownBy(() -> service.resolveForBooking(typed, ReservationType.TOURS))
                    .isInstanceOf(ReservationValidationException.class);
        }
    }

    @Test
    void aBlankCodeIsNoCodeAndAStayCannotUseOne() {
        assertThat(service.resolveForBooking("  ", ReservationType.TOURS)).isEmpty();
        assertThat(service.resolveForBooking(null, ReservationType.HEBERGEMENT)).isEmpty();
        assertThatThrownBy(() -> service.resolveForBooking("BADIRA10", ReservationType.HEBERGEMENT))
                .isInstanceOf(ReservationValidationException.class);
    }

    @Test
    void theBookingFormLearnsOnlyWhetherTheCodeWorks() {
        when(codes.findByCodeIgnoreCase("badira10")).thenReturn(Optional.of(badira()));
        assertThat(service.check("badira10").valid()).isTrue();
        assertThat(service.check("badira10").discountPercent()).isEqualByComparingTo("10");
        assertThat(service.check("zzz").valid()).isFalse();
    }

    @Test
    void theDiscountIsOnTheCircuitPriceAndSurvivesEveryRecalculation() {
        Reservation r = booking("200.000", ReservationStatus.CONFIRMED, "10");
        assertThat(r.getTotalAmount()).isEqualByComparingTo("180");
        assertThat(r.promoDiscountAmount()).isEqualByComparingTo("20");
        // a party change recalculates the circuit total: the discount must still apply
        assertThat(r.calculateTotalToursAmount()).isEqualByComparingTo("180");
        assertThat(booking("200.000", ReservationStatus.CONFIRMED, null).getTotalAmount()).isEqualByComparingTo("200");
    }

    @Test
    void theStatsCountConfirmedBookingsOnlyAndComputeTheCommission() {
        PromoCode code = badira();
        when(codes.findAll()).thenReturn(List.of(code));
        when(reservations.findByPromoCodeIgnoreCase("BADIRA10")).thenReturn(List.of(
                booking("200.000", ReservationStatus.CONFIRMED, "10"),   // pays 180, discount 20
                booking("100.000", ReservationStatus.COMPLETED, "10"),   // pays 90, discount 10
                booking("500.000", ReservationStatus.PENDING, "10"),     // not counted yet
                booking("300.000", ReservationStatus.CANCELLED, "10")    // never counted
        ));

        PromoCodeResponse stats = service.listWithStats().get(0);

        assertThat(stats.getReservations()).isEqualTo(2);
        assertThat(stats.getPendingReservations()).isEqualTo(1);
        assertThat(stats.getCircuitRevenue()).isEqualByComparingTo("270");
        assertThat(stats.getDiscountGiven()).isEqualByComparingTo("30");
        assertThat(stats.getCommissionDue()).isEqualByComparingTo("13.5"); // 5 % of 270
    }

    @Test
    void aCodeWithBookingsCannotBeDeleted() {
        PromoCode code = badira();
        java.util.UUID id = java.util.UUID.randomUUID();
        when(codes.findById(id)).thenReturn(Optional.of(code));
        when(reservations.findByPromoCodeIgnoreCase("BADIRA10"))
                .thenReturn(List.of(booking("100.000", ReservationStatus.PENDING, "10")));

        assertThatThrownBy(() -> service.delete(id)).isInstanceOf(ConflictException.class);
        verify(codes, never()).delete(any());
    }
}
