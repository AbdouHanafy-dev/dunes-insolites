package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DriverProfileCreateRequest {
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @NotBlank @Email private String email;
    private String phoneNumber;
    private String vehicleModel;
    @Min(1) private Integer numberOfSeats;
}
