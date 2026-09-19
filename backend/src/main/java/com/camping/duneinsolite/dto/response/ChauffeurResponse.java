package com.camping.duneinsolite.dto.response;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ChauffeurResponse {
    private UUID chauffeurId;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String vehicleModel;
    private Integer numberOfSeats;
    private UUID reservationId;
    private UUID driverProfileId;
    private UUID driverUserId;
    private String driverUserEmail;
    // Context for the backoffice roster view (GET /api/chauffeurs) - which
    // client/tour this assignment belongs to.
    private String clientName;
    private LocalDate tourDate;
}
