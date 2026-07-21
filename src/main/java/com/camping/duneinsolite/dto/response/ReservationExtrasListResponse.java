package com.camping.duneinsolite.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class ReservationExtrasListResponse {
    private List<ReservationExtraResponse> extras;
    private Double totalExtrasAmount; // sum of all totalPrice in the list
}