package com.camping.duneinsolite.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class DriverProfileResponse {
    private UUID driverProfileId;
    private UUID userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String vehicleModel;
    private Integer numberOfSeats;
    private boolean active;
}
