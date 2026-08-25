package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.model.Notification;
import com.camping.duneinsolite.repository.NotificationRepository;
import com.camping.duneinsolite.service.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final SseService sseService;
    private final NotificationRepository notificationRepository;

    // frontend calls this ONCE on login
    // opens a permanent connection
    // server pushes through this connection whenever needed
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return sseService.subscribe(userId);
    }

    // get all notifications for bell icon history
    @GetMapping
    public List<Notification> getMyNotifications(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return notificationRepository.findByUser_UserIdOrderByCreatedAtDesc(userId);
    }

    // unread count for the red badge on bell icon
    @GetMapping("/unread-count")
    public long getUnreadCount(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return notificationRepository.countByUser_UserIdAndIsReadFalse(userId);
    }

    // mark one notification as read when user clicks it
    @PatchMapping("/{notificationId}/read")
    public void markAsRead(@PathVariable UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }

    // mark all as read when user opens the bell dropdown
    @PatchMapping("/read-all")
    public void markAllAsRead(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        List<Notification> unread = notificationRepository
                .findByUser_UserIdAndIsReadFalse(userId);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }
}