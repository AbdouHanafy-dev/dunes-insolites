package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.NotificationRequest;
import com.camping.duneinsolite.dto.response.NotificationResponse;
import com.camping.duneinsolite.mapper.NotificationMapper;
import com.camping.duneinsolite.model.Notification;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.repository.NotificationRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationMapper notificationMapper;

    @Override
    public NotificationResponse createNotification(NotificationRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found: " + request.getUserId()));

        Notification notification = Notification.builder()
                .user(user)
                .type(request.getType())
                .title(request.getTitle())
                .message(request.getMessage())
                .isRead(false)
                .build();

        return notificationMapper.toResponse(notificationRepository.save(notification));
    }

//    @Override
//    @Transactional(readOnly = true)
//    public List<NotificationResponse> getNotificationsByUser(UUID userId) {
//        return notificationRepository.findByUserUserId(userId).stream()
//                .map(notificationMapper::toResponse).toList();
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public List<NotificationResponse> getUnreadNotificationsByUser(UUID userId) {
//        return notificationRepository.findByUserUserIdAndIsReadFalse(userId).stream()
//                .map(notificationMapper::toResponse).toList();
//    }

    @Override
    public NotificationResponse markAsRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
        notification.setIsRead(true);
        return notificationMapper.toResponse(notificationRepository.save(notification));
    }

//    @Override
//    public void markAllAsRead(UUID userId) {
//        notificationRepository.findByUserUserIdAndIsReadFalse(userId)
//                .forEach(n -> n.setIsRead(true));
//    }

    @Override
    public void deleteNotification(UUID notificationId) {
        notificationRepository.deleteById(notificationId);
    }
}