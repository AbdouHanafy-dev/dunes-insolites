package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.mail.ReservationMailer.PayMethod;
import com.camping.duneinsolite.model.PaymentPolicy;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.DepositMode;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentRequestServiceTest {

    private static PaymentPolicy policy(DepositMode mode, String percent) {
        return PaymentPolicy.builder()
                .id(1L)
                .depositMode(mode)
                .depositPercent(new BigDecimal(percent))
                .build();
    }

    @Test
    void noneAsksForNothingUpfront() {
        assertThat(PaymentRequestService.requiredUpfront(policy(DepositMode.NONE, "10.00"), new BigDecimal("500.000")))
                .isEqualByComparingTo("0");
    }

    @Test
    void percentIsTakenOfTheTotal() {
        assertThat(PaymentRequestService.requiredUpfront(policy(DepositMode.PERCENT, "10.00"), new BigDecimal("500.000")))
                .isEqualByComparingTo("50.000");
        assertThat(PaymentRequestService.requiredUpfront(policy(DepositMode.PERCENT, "33.33"), new BigDecimal("100.000")))
                .isEqualByComparingTo("33.330");
    }

    @Test
    void fullAsksForTheWholeTotal() {
        assertThat(PaymentRequestService.requiredUpfront(policy(DepositMode.FULL, "10.00"), new BigDecimal("500.000")))
                .isEqualByComparingTo("500.000");
    }

    @Test
    void theAmountSetOnTheBookingBeatsThePolicy() {
        PaymentPolicy p = policy(DepositMode.PERCENT, "10.00");
        Reservation r = new Reservation();

        // no amount on the booking -> the policy (10% of 200)
        assertThat(PaymentRequestService.requestedUpfront(r, p, new BigDecimal("200.000"))).isEqualByComparingTo("20.000");

        // staff asked for 40 of 200 (e.g. to match a payment link)
        r.setDepositAmount(new BigDecimal("40.000"));
        assertThat(PaymentRequestService.requestedUpfront(r, p, new BigDecimal("200.000"))).isEqualByComparingTo("40.000");

        // zero is an explicit "no deposit for this booking", not "unset"
        r.setDepositAmount(BigDecimal.ZERO);
        assertThat(PaymentRequestService.requestedUpfront(r, p, new BigDecimal("200.000"))).isEqualByComparingTo("0");
    }

    @Test
    void onlyAcceptedMethodsAreListedAndOnlineNeedsALink() {
        PaymentPolicy p = policy(DepositMode.PERCENT, "10.00");
        p.setAcceptOnlineLink(true);
        p.setAcceptCashOnSite(true);
        p.setAcceptCardOnSite(false);

        assertThat(PaymentRequestService.methodsOf(p, true)).containsExactly(PayMethod.ONLINE, PayMethod.CASH);
        assertThat(PaymentRequestService.methodsOf(p, false)).containsExactly(PayMethod.CASH);
    }
}
