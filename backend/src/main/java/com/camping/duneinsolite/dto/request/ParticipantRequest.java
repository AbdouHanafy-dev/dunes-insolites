package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class    ParticipantRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotNull(message = "Age is required")
    @Min(value = 0, message = "Age cannot be negative")
    private Integer age;

    @NotNull(message = "isAdult is required")
    private Boolean isAdult;
}