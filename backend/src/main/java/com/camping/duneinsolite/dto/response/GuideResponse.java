package com.camping.duneinsolite.dto.response;
import lombok.Data;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Data
public class GuideResponse {
    private UUID guideId;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private Set<SpokenLanguageResponse> languages;
    private UUID reservationId;
    // Context for the backoffice roster view (GET /api/guides) - which
    // client/tour this assignment belongs to.
    private String clientName;
    private LocalDate tourDate;
}