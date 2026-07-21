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
    private Double adultRemise;
    private Double childRemise;

    // For EXTRA
    private Double unitRemise;
}
