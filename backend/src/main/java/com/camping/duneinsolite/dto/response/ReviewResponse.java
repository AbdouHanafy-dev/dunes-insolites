package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.ProductType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ReviewResponse {
    private UUID reviewId;
    private UUID userId;
    private String userName;
    private UUID productId;
    private ProductType productType;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
