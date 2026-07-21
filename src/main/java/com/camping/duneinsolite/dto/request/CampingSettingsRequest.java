package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CampingSettingsRequest {
    @NotNull(message = "La capacité maximale est requise")
    @Min(value = 1, message = "La capacité maximale doit être d'au moins 1")
    private Integer maxCapacity;
}
