package com.camping.duneinsolite.dto.response;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class InvoiceItemResponse {
    private UUID invoiceItemId;
    private String description;
    private String itemType;
    private Integer quantity;
    private java.math.BigDecimal unitPrice;
    private java.math.BigDecimal totalPrice;
    private Integer lineNumber;
    private java.math.BigDecimal tva;
    private LocalDate activityDate;
    private LocalDate activityEndDate;
}