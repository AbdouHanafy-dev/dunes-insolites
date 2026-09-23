package com.camping.duneinsolite.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

/** What a "send payment request" call actually did, so the backoffice can say so. */
public record PaymentRequestResult(
        String sentTo,
        BigDecimal amountDue,
        String currency,
        LocalDate dueDate,
        boolean linkIncluded) {
}
