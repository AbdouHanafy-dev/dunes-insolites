package com.camping.duneinsolite.dto.request;

import jakarta.validation.Valid;
import lombok.Data;
import java.util.List;

@Data
public class ReservationStaffRequest {
    // Both are optional — user can send one, both, or mix of counts
    @Valid
    private List<GuideStaffRequest> guides;
    @Valid
    private List<ChauffeurStaffRequest> chauffeurs;
}