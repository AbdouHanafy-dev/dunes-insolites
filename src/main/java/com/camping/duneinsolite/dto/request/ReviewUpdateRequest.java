package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ReviewUpdateRequest {

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer rating;

    private String comment;
}
