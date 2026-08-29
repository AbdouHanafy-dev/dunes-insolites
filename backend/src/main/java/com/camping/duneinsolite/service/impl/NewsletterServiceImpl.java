package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.model.NewsletterSubscriber;
import com.camping.duneinsolite.repository.NewsletterSubscriberRepository;
import com.camping.duneinsolite.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsletterServiceImpl implements NewsletterService {

    private final NewsletterSubscriberRepository newsletterSubscriberRepository;

    @Override
    @Transactional
    public void subscribe(String email) {
        String normalized = email.trim().toLowerCase();
        if (newsletterSubscriberRepository.existsByEmail(normalized)) {
            log.info("Newsletter: {} already subscribed - no-op", normalized);
            return;
        }
        newsletterSubscriberRepository.save(
                NewsletterSubscriber.builder().email(normalized).build());
        log.info("Newsletter: new subscriber {}", normalized);
    }
}
