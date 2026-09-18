package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.ReservationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

/** What a driver needs to see about a trip they're assigned to - a small,
 *  deliberately narrower view than ReservationResponse (no pricing, no
 *  other guests' contact details beyond the group leader). */
@Data
@Builder
public class DriverTripResponse {
    private UUID reservationId;
    private UUID chauffeurId;
    private String tourName;
    private LocalDate serviceDate;
    private String groupName;
    private String groupLeaderName;
    private Integer numberOfAdults;
    private Integer numberOfChildren;
    private ReservationStatus status;
}
