package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.ProductType;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ProduitResponse {
    private UUID id;
    private ProductType type;
    private String name;
    private String description;
    // Prices — null when not applicable
    private Double passengerAdultPrice;
    private Double passengerChildPrice;
    private Double partnerAdultPrice;
    private Double partnerChildPrice;
    // For EXTRA only
    private Double unitPrice;
    private Double tva;
}
