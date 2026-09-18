package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChauffeurStaffRequest {
    @NotBlank(message = "First name is required")
    private String firstName;
    @NotBlank(message = "Last name is required")
    private String lastName;
    private String phoneNumber;
    // Optional - links this assignment to a real driver account (User.role
    // == CHAUFFEUR) so that account sees this trip on GET
    // /api/chauffeurs/my-trips. Most assignments leave this null.
    private String driverUserEmail;
}