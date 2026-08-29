package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.request.publicapi.NewsletterSubscribeRequest;
import com.camping.duneinsolite.service.NewsletterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The vitrine's newsletter signup (Newsletter.tsx). See SecurityConfig -
 * permitAll, same reasoning as PublicContactController. Real fix for the
 * same class of bug: the frontend's local stand-in validated the email and
 * returned success while it was never actually stored anywhere.
 */
@RestController
@RequestMapping("/api/public/subscribe")
@RequiredArgsConstructor
public class PublicNewsletterController {

    private final NewsletterService newsletterService;

    @PostMapping
    public ResponseEntity<Void> subscribe(@Valid @RequestBody NewsletterSubscribeRequest request) {
        newsletterService.subscribe(request.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
