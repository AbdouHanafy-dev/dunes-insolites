package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MeetUpPlaceRequest {
    // null / blank clears the field.
    @Size(max = 255)
    private String meetUpPlace;
}
