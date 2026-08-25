package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.NotificationRequest;
import com.camping.duneinsolite.dto.response.NotificationResponse;
import java.util.List;
import java.util.UUID;

public interface NotificationService {
    NotificationResponse createNotification(NotificationRequest request);
  //  List<NotificationResponse> getNotificationsByUser(UUID userId);
  //  List<NotificationResponse> getUnreadNotificationsByUser(UUID userId);
    NotificationResponse markAsRead(UUID notificationId);
   // void markAllAsRead(UUID userId);
    void deleteNotification(UUID notificationId);
}
