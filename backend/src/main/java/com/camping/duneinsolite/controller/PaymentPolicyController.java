package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.PaymentPolicyRequest;
import com.camping.duneinsolite.dto.response.PaymentPolicyResponse;
import com.camping.duneinsolite.service.PaymentPolicyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * The business's payment rules (deposit, deadline, accepted methods). Staff
 * read it to show what a client will be asked; only ADMIN changes it - same
 * hardcoded-ADMIN write side as SiteSettingsController.
 */
@RestController
@RequestMapping("/api/payment-policy")
@RequiredArgsConstructor
public class PaymentPolicyController {

    private final PaymentPolicyService paymentPolicyService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<PaymentPolicyResponse> getPolicy() {
        return ResponseEntity.ok(paymentPolicyService.getPolicy());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PaymentPolicyResponse> updatePolicy(@Valid @RequestBody PaymentPolicyRequest request) {
        return ResponseEntity.ok(paymentPolicyService.updatePolicy(request));
    }
}
