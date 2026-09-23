package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.Currency;
import com.camping.duneinsolite.model.enums.PaymentMethod;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.UUID;

@Data
public class TransactionRequest {

    @NotNull(message = "Reservation ID is required")
    private UUID reservationId;

    // Optional — can be linked to an invoice
    private UUID invoiceId;

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private java.math.BigDecimal amount;

    @NotNull(message = "Currency is required")
    private Currency currency;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    // Email the client "we received your payment" (in their language, with how
    // to settle the rest). Absent = yes; staff untick it for a payment they do
    // not want announced.
    private Boolean notifyClient;
}