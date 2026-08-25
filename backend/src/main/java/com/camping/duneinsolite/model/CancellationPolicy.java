package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CancellationPolicy {

    @Column(name = "free_cancellation")
    private Boolean freeCancellation;

    @Column(name = "cancellation_hours_before_deadline")
    private Integer hoursBeforeDeadline;
}
