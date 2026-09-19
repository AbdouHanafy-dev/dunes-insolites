package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SpokenLanguageRequest {
    @NotBlank(message = "Name is required")
    private String name;
}
