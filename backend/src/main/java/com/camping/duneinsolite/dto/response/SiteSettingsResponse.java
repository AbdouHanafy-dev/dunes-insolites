package com.camping.duneinsolite.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class SiteSettingsResponse {
    private String email;
    private String phone;
    private String whatsapp;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String instagramUrl;
    private String facebookUrl;
    private String tiktokUrl;
    private String guestsGuided;
    private String yearsRunning;
    private LocalDateTime updatedAt;
}
