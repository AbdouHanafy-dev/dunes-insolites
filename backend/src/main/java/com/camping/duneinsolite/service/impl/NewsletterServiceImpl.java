package com.camping.duneinsolite.service.impl;

import static com.camping.duneinsolite.observability.LogSanitizer.maskEmail;
import com.camping.duneinsolite.dto.response.NewsletterSubscriberResponse;
import com.camping.duneinsolite.model.NewsletterSubscriber;
import com.camping.duneinsolite.repository.NewsletterSubscriberRepository;
import com.camping.duneinsolite.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsletterServiceImpl implements NewsletterService {

    private final NewsletterSubscriberRepository newsletterSubscriberRepository;
    private final EmailService emailService;

    @Override
    @Transactional
    public long subscribe(String email) {
        String normalized = email.trim().toLowerCase();
        if (newsletterSubscriberRepository.existsByEmail(normalized)) {
            log.info("Newsletter: {} already subscribed - no-op", maskEmail(normalized));
            return newsletterSubscriberRepository.count();
        }
        newsletterSubscriberRepository.save(
                NewsletterSubscriber.builder().email(normalized).build());
        log.info("Newsletter: new subscriber {}", maskEmail(normalized));
        return newsletterSubscriberRepository.count();
    }

    @Override
    public List<NewsletterSubscriberResponse> listAll() {
        return newsletterSubscriberRepository.findAllByOrderBySubscribedAtDesc().stream()
                .map(NewsletterServiceImpl::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public int sendLaunchAnnouncementToAll() {
        List<NewsletterSubscriber> pending = newsletterSubscriberRepository.findByLaunchEmailSentAtIsNull();
        LocalDateTime now = LocalDateTime.now();
        for (NewsletterSubscriber subscriber : pending) {
            emailService.sendLaunchAnnouncementEmail(subscriber.getEmail());
            subscriber.setLaunchEmailSentAt(now);
        }
        newsletterSubscriberRepository.saveAll(pending);
        log.info("Newsletter: launch announcement triggered for {} subscriber(s)", pending.size());
        return pending.size();
    }

    private static NewsletterSubscriberResponse toResponse(NewsletterSubscriber subscriber) {
        NewsletterSubscriberResponse response = new NewsletterSubscriberResponse();
        response.setId(subscriber.getId());
        response.setEmail(subscriber.getEmail());
        response.setSubscribedAt(subscriber.getSubscribedAt());
        response.setLaunchEmailSentAt(subscriber.getLaunchEmailSentAt());
        return response;
    }
}
