package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SiteSettingsRequest {

    @NotBlank(message = "L'email est requis")
    private String email;

    @NotBlank(message = "Le téléphone est requis")
    private String phone;

    @NotBlank(message = "Le numéro WhatsApp est requis")
    private String whatsapp;

    @NotBlank(message = "L'adresse est requise")
    private String address;

    private BigDecimal latitude;
    private BigDecimal longitude;

    // Optional — a social platform this business isn't on yet has no URL,
    // never an invented one.
    private String instagramUrl;
    private String facebookUrl;
    private String tiktokUrl;

    @NotBlank(message = "Le nombre de clients est requis")
    private String guestsGuided;

    @NotBlank(message = "Le nombre d'années est requis")
    private String yearsRunning;

    // Optional - clearing this clears the cached rating too (see
    // SiteSettingsServiceImpl.updateSettings).
    private String googlePlaceId;

    // Optional - the rating and review count as shown on the Google
    // profile. Both blank = show none.
    @DecimalMin(value = "1.0", message = "La note doit être comprise entre 1 et 5")
    @DecimalMax(value = "5.0", message = "La note doit être comprise entre 1 et 5")
    private BigDecimal manualGoogleRating;

    @Min(value = 0, message = "Le nombre d'avis ne peut pas être négatif")
    private Integer manualGoogleRatingCount;
}
