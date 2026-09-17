package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.PricingUnit;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ServiceOptionRequest {

    @NotBlank(message = "Slug is required")
    private String slug;

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotNull(message = "Category is required")
    private ServiceOptionCategory category;

    @NotBlank(message = "Type is required")
    private String type;

    @NotNull(message = "Pricing unit is required")
    private PricingUnit pricingUnit;

    /** Null = not configured (option stays unbookable). */
    @DecimalMin(value = "0.0", message = "Price cannot be negative")
    private BigDecimal unitPriceTtc;

    @DecimalMin(value = "0.0", message = "TVA rate cannot be negative")
    private BigDecimal tvaRate;

    /** Null = not configured, no ceiling enforced. */
    @Min(value = 0, message = "Capacity cannot be negative")
    private Integer maxUnitsPerDay;

    private Boolean requiresPickupLocation;
    private Boolean requiresCustomerVehicle;
    private Integer displayOrder;
    private Boolean active;
}
