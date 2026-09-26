package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.response.PromoCodeCheckResponse;
import com.camping.duneinsolite.service.PromoCodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lets the booking form tell a guest whether the code they typed works, and for how much. It only
 * answers yes or no and the percentage - nothing about the partner - and the server checks the code
 * again when the booking is sent, so this is a convenience, not an authority.
 */
@RestController
@RequestMapping("/api/public/promo-codes")
@RequiredArgsConstructor
public class PublicPromoCodeController {

    private final PromoCodeService promoCodeService;

    @GetMapping("/check")
    public ResponseEntity<PromoCodeCheckResponse> check(@RequestParam String code) {
        return ResponseEntity.ok(promoCodeService.check(code));
    }
}
