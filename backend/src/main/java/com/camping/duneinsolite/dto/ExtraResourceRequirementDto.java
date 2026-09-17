package com.camping.duneinsolite.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ExtraResourceRequirementDto(
        @NotNull UUID resourceExtraId,
        @Min(1) int quantity,
        String resourceName) {}
