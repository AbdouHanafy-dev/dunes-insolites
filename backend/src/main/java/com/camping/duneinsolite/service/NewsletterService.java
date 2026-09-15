package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.NewsletterSubscriberResponse;
import com.camping.duneinsolite.dto.response.SendLaunchEmailResponse;

import java.util.List;
import java.util.UUID;

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

    /** Removes one subscriber from the mailing list. */
    void deleteSubscriber(UUID subscriberId);

    /** Removes the entire mailing list and returns the number deleted. */
    long deleteAllSubscribers();

    /**
     * Sends the "site is ready" launch announcement to every subscriber who
     * hasn't already gotten it, marking a subscriber as sent only once
     * delivery actually succeeds — a failed attempt (bad SMTP credential,
     * bouncing address) stays pending for the next press rather than being
     * silently marked done. Safe to press more than once (see
     * NewsletterSubscriber.launchEmailSentAt's own comment).
     */
    SendLaunchEmailResponse sendLaunchAnnouncementToAll();
}
