package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.CompanyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GalleryImageRequest {

    @NotBlank(message = "Image URL is required")
    @Size(max = 512, message = "Image URL must be at most 512 characters")
    private String imageUrl;

    @NotBlank(message = "Alt text is required")
    @Size(max = 255, message = "Alt text must be at most 255 characters")
    private String alt;

    @NotBlank(message = "Tag is required")
    @Size(max = 120, message = "Tag must be at most 120 characters")
    private String tag;

    private Boolean tall;

    private Integer position;

    /** Optional — defaults to DUNES_INSOLITES, the only vitrine live today. */
    private CompanyType companyType;
}
