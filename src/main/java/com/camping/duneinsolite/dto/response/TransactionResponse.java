package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.Currency;
import com.camping.duneinsolite.model.enums.PaymentMethod;
import com.camping.duneinsolite.model.enums.TransactionStatus;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class TransactionResponse {
    private UUID transactionId;
    private String transactionNumber;
    private Double amount;
    private Currency currency;
    private PaymentMethod paymentMethod;
    private TransactionStatus status;
    private LocalDateTime transactionDate;
    private UUID reservationId;
    private UUID invoiceId;
}