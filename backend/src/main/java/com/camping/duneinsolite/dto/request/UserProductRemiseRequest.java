package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.ProductType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class UserProductRemiseRequest {

    @NotNull
    private UUID productId;

    @NotNull
    private ProductType productType;

    private String productName;

    // For TOURTYPE and TOUR
    private java.math.BigDecimal adultRemise;
    private java.math.BigDecimal childRemise;

    // For EXTRA
    private java.math.BigDecimal unitRemise;
}
