package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RejectTourRequest {

    @NotBlank(message = "A rejection reason is required")
    private String reason;
}
