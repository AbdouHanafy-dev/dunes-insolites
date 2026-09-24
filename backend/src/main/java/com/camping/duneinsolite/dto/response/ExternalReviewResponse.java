package com.camping.duneinsolite.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExternalReviewResponse {
    private UUID externalReviewId;
    private String authorName;
    private String country;
    private Integer rating;
    private LocalDate reviewDate;
    private String title;
    private String body;
    private UUID platformId;
    private String platformName;
    private String platformColor;
    private String sourceUrl;
    private String tripType;
    private String ownerReply;
    private LocalDate ownerReplyDate;
    private boolean published;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
