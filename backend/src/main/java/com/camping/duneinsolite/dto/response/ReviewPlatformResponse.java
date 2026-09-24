package com.camping.duneinsolite.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewPlatformResponse {
    private UUID platformId;
    private String name;
    private String color;
    /** True for the well-known platforms the site already recognises. */
    private boolean builtIn;
    /** How many reviews currently use this platform (a platform in use can't be deleted). */
    private long reviewCount;
}
