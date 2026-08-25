package com.camping.duneinsolite.dto.response;

import lombok.Data;
import java.util.UUID;

@Data
public class ChauffeurResponse {
    private UUID chauffeurId;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private UUID reservationId;
}