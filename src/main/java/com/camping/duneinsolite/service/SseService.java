package com.camping.duneinsolite.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class SseService {

    // stores one emitter per connected user
    // key   = userId
    // value = their open SSE connection
    // ConcurrentHashMap = thread safe (multiple users connect simultaneously)
    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID userId) {

        // SseEmitter = one open HTTP connection to one browser tab
        // Long.MAX_VALUE = keep it open forever (no timeout)
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        // store it so NotificationConsumer can find it later
        emitters.put(userId, emitter);

        // when browser closes the tab → remove from map
        emitter.onCompletion(() -> {
            emitters.remove(userId);
            log.info("SSE connection closed for user {}", userId);
        });

        // when connection times out → remove from map
        emitter.onTimeout(() -> {
            emitters.remove(userId);
            log.info("SSE connection timed out for user {}", userId);
        });

        // when any error happens → remove from map
        emitter.onError(e -> {
            emitters.remove(userId);
            log.warn("SSE connection error for user {}: {}", userId, e.getMessage());
        });

        log.info("SSE connection opened for user {}", userId);
        return emitter;
    }

    public void sendToUser(UUID userId, String title, String message, UUID reservationId) {

        // find the open connection for this user
        SseEmitter emitter = emitters.get(userId);

        // if null → user is not connected (browser closed)
        // that is fine → notification is already saved in DB
        // user will see it next time they open the app
        if (emitter == null) {
            log.info("User {} not connected via SSE, skipping push", userId);
            return;
        }

        try {
            Map<String, Object> data = new java.util.HashMap<>();
            data.put("title", title);
            data.put("message", message);
            if (reservationId != null) {
                data.put("reservationId", reservationId.toString());
            }
            // send the notification through the open connection
            // event name = "notification" → Angular listens for this name
            // data = map with title and message → arrives as JSON in browser
            emitter.send(
                    SseEmitter.event()
                            .name("notification")
                            .data(data)
            );
            log.info("SSE notification pushed to user {}", userId);

        } catch (IOException e) {
            // connection was broken → remove it
            log.warn("Failed to send SSE to user {}, removing emitter", userId);
            emitters.remove(userId);
        }
    }
}