package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class TourHebergementRequest {

    @NotNull(message = "TourType ID is required for hebergement")
    private UUID tourTypeId;

    private LocalDate activityDate;

    private Integer numberOfNights;

    private Integer numberOfAdults;

    private Integer numberOfChildren;

    private List<RepartitionRequest> repartitions;
}
