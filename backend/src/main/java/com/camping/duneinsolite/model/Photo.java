package com.camping.duneinsolite.model;

import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Photo {

    @Column(name = "url", nullable = false)
    private String url;

    @Column(name = "caption")
    private String caption;
}
