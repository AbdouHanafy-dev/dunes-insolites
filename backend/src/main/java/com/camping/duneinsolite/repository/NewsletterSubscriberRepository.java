package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.NewsletterSubscriber;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NewsletterSubscriberRepository extends JpaRepository<NewsletterSubscriber, UUID> {
    boolean existsByEmail(String email);

    // Used by the self-service data export (Phase 5) to tell a user whether
    // their email is on the marketing list.
    Optional<NewsletterSubscriber> findByEmail(String email);

    // Whoever hasn't gotten the launch announcement yet — see
    // NewsletterSubscriber.launchEmailSentAt's own comment.
    List<NewsletterSubscriber> findByLaunchEmailSentAtIsNull();

    List<NewsletterSubscriber> findAllByOrderBySubscribedAtDesc();
}
