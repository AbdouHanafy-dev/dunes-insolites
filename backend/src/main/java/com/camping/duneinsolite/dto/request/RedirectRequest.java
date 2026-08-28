package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class RedirectRequest {

    @NotBlank(message = "From path is required")
    @Pattern(regexp = "^/.*", message = "From path must start with /")
    private String fromPath;

    @NotBlank(message = "To path is required")
    private String toPath;

    private Integer statusCode;
}
