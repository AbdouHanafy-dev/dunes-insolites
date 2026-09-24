package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewPlatformRequest {

    @NotBlank(message = "Le nom de la plateforme est requis")
    @Size(max = 80, message = "Le nom doit faire 80 caractères au plus")
    private String name;

    @NotBlank(message = "La couleur est requise")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur doit être au format #RRGGBB")
    private String color;
}
