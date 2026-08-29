package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.NewsletterSubscriber;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NewsletterSubscriberRepository extends JpaRepository<NewsletterSubscriber, UUID> {
    boolean existsByEmail(String email);
}
