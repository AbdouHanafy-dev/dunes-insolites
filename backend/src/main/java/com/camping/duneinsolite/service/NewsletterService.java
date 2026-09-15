package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.NewsletterSubscriberResponse;

import java.util.List;

public interface NewsletterService {
    /**
     * Idempotent - subscribing an already-subscribed email is a no-op
     * success, not an error. Returns the real current subscriber count
     * (used by the frontend as a "you're #N on the list" touch, on
     * request) - never a number invented client-side.
     */
    long subscribe(String email);

    /** Newest first — the admin list view. */
    List<NewsletterSubscriberResponse> listAll();

    /**
     * Sends the "site is ready" launch announcement to every subscriber who
     * hasn't already gotten it, marks each as sent, and returns how many
     * that was. Safe to press more than once (see
     * NewsletterSubscriber.launchEmailSentAt's own comment).
     */
    int sendLaunchAnnouncementToAll();
}
