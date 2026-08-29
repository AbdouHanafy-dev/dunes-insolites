package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.request.publicapi.ContactRequest;
import com.camping.duneinsolite.service.PublicContactService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The vitrine's contact form (ContactForm.tsx). See SecurityConfig - this
 * specific path is permitAll, same as the other /api/public/** write
 * endpoints. Real fix for a real bug found in the SEO/vitrine audit: the
 * frontend's local route-handler stand-in for this endpoint validated the
 * input and returned success while the message went nowhere - this is what
 * lib/api.ts's sendContact() actually calls once NEXT_PUBLIC_API_URL points
 * here.
 */
@RestController
@RequestMapping("/api/public/contact")
@RequiredArgsConstructor
public class PublicContactController {

    private final PublicContactService publicContactService;

    @PostMapping
    public ResponseEntity<Void> submitContactMessage(@Valid @RequestBody ContactRequest request) {
        publicContactService.submitContactMessage(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
