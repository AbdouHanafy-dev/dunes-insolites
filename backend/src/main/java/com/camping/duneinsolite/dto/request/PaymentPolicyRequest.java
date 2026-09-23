package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.DepositMode;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentPolicyRequest {

    @NotNull(message = "Le mode d'acompte est requis")
    private DepositMode depositMode;

    @NotNull(message = "Le pourcentage est requis")
    @DecimalMin(value = "0.00", message = "Le pourcentage ne peut pas être négatif")
    @DecimalMax(value = "100.00", message = "Le pourcentage ne peut pas dépasser 100")
    private BigDecimal depositPercent;

    @Min(value = 0, message = "Le délai ne peut pas être négatif")
    private Integer deadlineDaysBefore;

    private boolean acceptOnlineLink;
    private boolean acceptBankTransfer;
    private boolean acceptCardOnSite;
    private boolean acceptCashOnSite;
    private boolean acceptCheque;

    @Size(max = 1000, message = "La note est limitée à 1000 caractères")
    private String note;
}
