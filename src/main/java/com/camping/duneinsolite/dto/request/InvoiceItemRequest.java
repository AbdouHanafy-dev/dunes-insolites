package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class InvoiceItemRequest {

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Item type is required")
    private String itemType;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    @NotNull(message = "Unit price is required")
    @Positive(message = "Unit price must be positive")
    private Double unitPrice;

    @NotNull(message = "Line number is required")
    private Integer lineNumber;

    private Double tva;

    private LocalDate activityDate;

    private LocalDate activityEndDate;
}