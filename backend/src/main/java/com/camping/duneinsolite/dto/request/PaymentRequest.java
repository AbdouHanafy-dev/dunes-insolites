package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.Currency;
import com.camping.duneinsolite.model.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PaymentRequest {

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    private Double amount;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;
    @NotNull(message = "Currency is required")
    private Currency currency;
}