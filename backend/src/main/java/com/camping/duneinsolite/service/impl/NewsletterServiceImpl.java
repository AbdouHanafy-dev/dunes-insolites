package com.camping.duneinsolite.service.impl;

import static com.camping.duneinsolite.observability.LogSanitizer.maskEmail;
import com.camping.duneinsolite.dto.response.NewsletterSubscriberResponse;
import com.camping.duneinsolite.dto.response.SendLaunchEmailResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.NewsletterSubscriber;
import com.camping.duneinsolite.repository.NewsletterSubscriberRepository;
import com.camping.duneinsolite.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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
    public void deleteSubscriber(UUID subscriberId) {
        NewsletterSubscriber subscriber = newsletterSubscriberRepository.findById(subscriberId)
                .orElseThrow(() -> new ResourceNotFoundException("Newsletter subscriber not found: " + subscriberId));
        newsletterSubscriberRepository.delete(subscriber);
        log.info("Newsletter: subscriber {} deleted", maskEmail(subscriber.getEmail()));
    }

    @Override
    @Transactional
    public long deleteAllSubscribers() {
        long deleted = newsletterSubscriberRepository.count();
        newsletterSubscriberRepository.deleteAllInBatch();
        log.info("Newsletter: all {} subscriber(s) deleted", deleted);
        return deleted;
    }

    @Override
    @Transactional
    public SendLaunchEmailResponse sendLaunchAnnouncementToAll() {
        List<NewsletterSubscriber> pending = newsletterSubscriberRepository.findByLaunchEmailSentAtIsNull();
        LocalDateTime now = LocalDateTime.now();
        int sent = 0;
        int failed = 0;
        for (NewsletterSubscriber subscriber : pending) {
            try {
                emailService.sendLaunchAnnouncementEmail(subscriber.getEmail());
                subscriber.setLaunchEmailSentAt(now);
                newsletterSubscriberRepository.save(subscriber);
                sent++;
            } catch (Exception e) {
                // Stays pending (launchEmailSentAt untouched) - one bad
                // address or a bad SMTP credential must never stop the
                // rest of the list, and must never be mistaken for done.
                log.error("Newsletter: launch announcement failed for {} — {}", maskEmail(subscriber.getEmail()), e.getMessage());
                failed++;
            }
        }
        log.info("Newsletter: launch announcement sent to {} subscriber(s), {} failed", sent, failed);
        return new SendLaunchEmailResponse(sent, failed);
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
