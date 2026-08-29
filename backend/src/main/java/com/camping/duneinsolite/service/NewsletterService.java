package com.camping.duneinsolite.service;

public interface NewsletterService {
    /** Idempotent - subscribing an already-subscribed email is a no-op success, not an error. */
    void subscribe(String email);
}
