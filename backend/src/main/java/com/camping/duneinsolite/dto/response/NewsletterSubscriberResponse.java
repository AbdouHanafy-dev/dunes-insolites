package com.camping.duneinsolite.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NewsletterSubscriberResponse {
    private UUID id;
    private String email;
    private LocalDateTime subscribedAt;
    private LocalDateTime launchEmailSentAt;
}
