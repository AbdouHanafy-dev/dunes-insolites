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
    private java.math.BigDecimal passengerAdultPrice;
    private java.math.BigDecimal passengerChildPrice;
    private java.math.BigDecimal passengerInfantPrice;
    private java.math.BigDecimal partnerAdultPrice;
    private java.math.BigDecimal partnerChildPrice;
    // For EXTRA only
    private java.math.BigDecimal unitPrice;
    private java.math.BigDecimal tva;
}
