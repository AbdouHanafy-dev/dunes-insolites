package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.response.NewsletterSubscriberResponse;
import com.camping.duneinsolite.dto.response.SendLaunchEmailResponse;
import com.camping.duneinsolite.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * The admin-facing side of the vitrine's newsletter signup (see
 * PublicNewsletterController for the public POST /api/public/subscribe
 * every visitor hits) — a list of who's on it, and the one-click "site is
 * ready" launch announcement. AdminResource.NEWSLETTER_SUBSCRIBERS in the
 * permission matrix, same idiom as MaintenanceWindowController.
 */
@RestController
@RequestMapping("/api/newsletter-subscribers")
@RequiredArgsConstructor
public class NewsletterSubscriberController {

    private final NewsletterService newsletterService;

    @GetMapping
    @PreAuthorize("@perm.can('NEWSLETTER_SUBSCRIBERS', 'READ')")
    public ResponseEntity<List<NewsletterSubscriberResponse>> getAllSubscribers() {
        return ResponseEntity.ok(newsletterService.listAll());
    }

    @DeleteMapping("/{subscriberId}")
    @PreAuthorize("@perm.can('NEWSLETTER_SUBSCRIBERS', 'FULL')")
    public ResponseEntity<Void> deleteSubscriber(@PathVariable UUID subscriberId) {
        newsletterService.deleteSubscriber(subscriberId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @PreAuthorize("@perm.can('NEWSLETTER_SUBSCRIBERS', 'FULL')")
    public ResponseEntity<Void> deleteAllSubscribers() {
        newsletterService.deleteAllSubscribers();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/send-launch-email")
    @PreAuthorize("@perm.can('NEWSLETTER_SUBSCRIBERS', 'FULL')")
    public ResponseEntity<SendLaunchEmailResponse> sendLaunchEmail() {
        return ResponseEntity.ok(newsletterService.sendLaunchAnnouncementToAll());
    }
}
