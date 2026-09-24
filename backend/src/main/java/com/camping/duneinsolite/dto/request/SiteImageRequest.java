package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SiteImageRequest {

    /** A /media/... path from the media library, or an absolute http(s) URL. */
    @NotBlank(message = "L'adresse de la photo est requise")
    @Size(max = 512, message = "L'adresse doit faire 512 caractères au plus")
    private String url;
}
