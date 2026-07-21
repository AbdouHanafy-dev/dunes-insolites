package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class TourSelectionRequest {

    @NotNull(message = "Tour ID is required")
    private UUID tourId;

    private List<TourHebergementRequest> hebergements;
}