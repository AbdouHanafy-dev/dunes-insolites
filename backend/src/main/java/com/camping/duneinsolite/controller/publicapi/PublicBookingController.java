package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.request.publicapi.PublicActivityBookingRequest;
import com.camping.duneinsolite.dto.response.publicapi.PublicBookingResponse;
import com.camping.duneinsolite.service.PublicBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Guest checkout for a standalone activity booking (DI-013) - no login
 * step. See SecurityConfig - this specific path is permitAll.
 */
@RestController
@RequestMapping("/api/public/bookings")
@RequiredArgsConstructor
public class PublicBookingController {

    private final PublicBookingService publicBookingService;

    @PostMapping
    public ResponseEntity<PublicBookingResponse> createBooking(
            @Valid @RequestBody PublicActivityBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(publicBookingService.createActivityBooking(request));
    }
}
