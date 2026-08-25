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
    private Double unitPrice;
    private Double totalPrice;
    private Integer lineNumber;
    private Double tva;
    private LocalDate activityDate;
    private LocalDate activityEndDate;
}