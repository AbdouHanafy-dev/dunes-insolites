package com.camping.duneinsolite.dto.response;

import lombok.Data;
import com.camping.duneinsolite.model.PickupDetails;
import com.camping.duneinsolite.model.enums.ExtraCategory;
import com.camping.duneinsolite.model.enums.PricingUnit;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ReservationExtraResponse {
    private UUID reservationExtraId;
    private UUID reservationId;
    private UUID catalogExtraId;
    private UUID selectedExtraId;
    private String name;
    private String description;
    private String duration;
    private Integer quantity;
    private java.math.BigDecimal unitPrice;
    private java.math.BigDecimal totalPrice;
    private Boolean isActive;
    private LocalDate activityDate;
    private java.math.BigDecimal tva;
    private ExtraCategory category;
    private String serviceType;
    private PricingUnit pricingUnit;
    private PickupDetails pickupDetails;
    private boolean resourceAllocation;
}
