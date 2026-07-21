package com.camping.duneinsolite.dto.response;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class TourHebergementResponseDto {
    private UUID hebergementId;
    private String name;
    private String description;
    private String duration;
    private Integer numberOfNights;
    private Integer numberOfAdults;
    private Integer numberOfChildren;
    private LocalDate activityDate;
}
