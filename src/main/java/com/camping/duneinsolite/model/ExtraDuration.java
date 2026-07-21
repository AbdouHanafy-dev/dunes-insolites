package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ExtraDuration {

    @Column(name = "duration_start_time")
    private LocalTime startTime;

    @Column(name = "duration_end_time")
    private LocalTime endTime;
}
