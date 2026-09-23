package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.DepositMode;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PaymentPolicyResponse {
    private DepositMode depositMode;
    private BigDecimal depositPercent;
    private Integer deadlineDaysBefore;
    private boolean acceptOnlineLink;
    private boolean acceptBankTransfer;
    private boolean acceptCardOnSite;
    private boolean acceptCashOnSite;
    private boolean acceptCheque;
    private String note;
    private LocalDateTime updatedAt;
}
