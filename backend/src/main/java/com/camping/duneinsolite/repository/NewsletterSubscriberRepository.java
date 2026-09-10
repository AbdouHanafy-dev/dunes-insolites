package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.NewsletterSubscriber;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface NewsletterSubscriberRepository extends JpaRepository<NewsletterSubscriber, UUID> {
    boolean existsByEmail(String email);

    // Used by the self-service data export (Phase 5) to tell a user whether
    // their email is on the marketing list.
    Optional<NewsletterSubscriber> findByEmail(String email);
}
