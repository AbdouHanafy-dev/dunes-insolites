package com.camping.duneinsolite.dto.response;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationResponseGrandTotalTest {

    @Test
    void grandTotalIsTheStayPlusItsExtras() {
        var response = new ReservationResponse();
        response.setTotalAmount(new BigDecimal("100.000"));
        response.setTotalExtrasAmount(new BigDecimal("60.000"));

        assertThat(response.getGrandTotalAmount()).isEqualByComparingTo("160");
    }

    @Test
    void aBookingWithoutExtrasIsItsStayAmountAlone() {
        var response = new ReservationResponse();
        response.setTotalAmount(new BigDecimal("100.000"));
        response.setTotalExtrasAmount(null);

        assertThat(response.getGrandTotalAmount()).isEqualByComparingTo("100");
    }
}
