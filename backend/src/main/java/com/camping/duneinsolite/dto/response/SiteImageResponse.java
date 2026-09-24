package com.camping.duneinsolite.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SiteImageResponse {
    private String key;
    private String url;
    private LocalDateTime updatedAt;
}
