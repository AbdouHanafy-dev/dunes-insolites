package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.ProductType;
import lombok.Data;

import java.util.UUID;

@Data
public class UserProductRemiseResponse {
    private UUID id;
    private UUID productId;
    private ProductType productType;
    private String productName;
    private Double adultRemise;
    private Double childRemise;
    private Double unitRemise;
}
