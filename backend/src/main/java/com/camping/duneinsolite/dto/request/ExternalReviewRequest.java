package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ExternalReviewRequest {

    @NotBlank(message = "Le nom de l'auteur est requis")
    @Size(max = 120, message = "Le nom doit faire 120 caractères au plus")
    private String authorName;

    @Size(max = 80, message = "Le pays doit faire 80 caractères au plus")
    private String country;

    @NotNull(message = "La note est requise")
    @Min(value = 1, message = "La note doit être comprise entre 1 et 5")
    @Max(value = 5, message = "La note doit être comprise entre 1 et 5")
    private Integer rating;

    @NotNull(message = "La date de l'avis est requise")
    private LocalDate reviewDate;

    @Size(max = 200, message = "Le titre doit faire 200 caractères au plus")
    private String title;

    /** Exactly what the guest wrote, in their own language. */
    @NotBlank(message = "Le texte de l'avis est requis")
    private String body;

    /** An existing platform... */
    private UUID platformId;

    /** ...or, when platformId is empty, the name (and colour) of a platform
     *  not in the list yet — it is created with the review. A platform with
     *  the same name is reused instead of duplicated. */
    @Size(max = 80, message = "Le nom de la plateforme doit faire 80 caractères au plus")
    private String newPlatformName;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur doit être au format #RRGGBB")
    private String newPlatformColor;

    @Size(max = 512, message = "Le lien doit faire 512 caractères au plus")
    private String sourceUrl;

    @Size(max = 120, message = "Le type de voyage doit faire 120 caractères au plus")
    private String tripType;

    private String ownerReply;
    private LocalDate ownerReplyDate;

    /** Optional — defaults to published. */
    private Boolean published;
}
