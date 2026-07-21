package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.ProductType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.UUID;

@Data
public class ReviewRequest {

    @NotNull(message = "Product id is required")
    private UUID productId;

    @NotNull(message = "Product type is required")
    private ProductType productType;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer rating;

    private String comment;
}
