package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequestSendRequest {

    /** Optional. When set it becomes the reservation's payment link. */
    @Size(max = 500, message = "Le lien de paiement est trop long")
    private String paymentLink;

    /**
     * Optional. The amount to ask this client for upfront (0 = nothing). When
     * absent the reservation's saved amount, or the payment policy, applies.
     */
    @DecimalMin(value = "0.000", message = "Le montant ne peut pas être négatif")
    private BigDecimal amount;
}
