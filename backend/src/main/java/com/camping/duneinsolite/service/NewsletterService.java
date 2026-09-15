package com.camping.duneinsolite.service;

public interface NewsletterService {
    /**
     * Idempotent - subscribing an already-subscribed email is a no-op
     * success, not an error. Returns the real current subscriber count
     * (used by the frontend as a "you're #N on the list" touch, on
     * request) - never a number invented client-side.
     */
    long subscribe(String email);
}
