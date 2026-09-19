package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class DriverProfileUpdateRequest {
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String vehicleModel;
    @Min(1) private Integer numberOfSeats;
    private Boolean active;
}
