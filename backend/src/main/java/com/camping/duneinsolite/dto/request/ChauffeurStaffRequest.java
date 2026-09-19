package com.camping.duneinsolite.dto.request;

import lombok.Data;

import java.util.UUID;

@Data
public class ChauffeurStaffRequest {
    // Preferred flow: select one permanent active profile. Legacy free-text
    // fields remain accepted for old API clients and historical imports.
    private UUID driverProfileId;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    // The chauffeur's own vehicle. Both optional.
    private String vehicleModel;
    private Integer numberOfSeats;
    // Optional - links this assignment to a real driver account (User.role
    // == CHAUFFEUR) so that account sees this trip on GET
    // /api/chauffeurs/my-trips. Most assignments leave this null.
    private String driverUserEmail;
}
