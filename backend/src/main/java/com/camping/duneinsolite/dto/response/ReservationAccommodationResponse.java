package com.camping.duneinsolite.dto.response;

import lombok.Data;

import java.util.UUID;

/** One accommodation tier booked on a stay ("Suite x 2"), as the back office lists it. */
@Data
public class ReservationAccommodationResponse {
    private UUID accommodationTypeId;
    private String accommodationName;
    private Integer accommodationUnits;
    private Integer adults;
    private Integer children;
    private Integer infants;
}
