package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.request.publicapi.PublicTourBookingRequest;
import com.camping.duneinsolite.dto.response.publicapi.PublicTourBookingResponse;
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
 * Guest checkout for a Route Insolite tour booking (request-to-book, no
 * live availability gate — see PublicTourController's own comment). No
 * login step. See SecurityConfig — this specific path is permitAll.
 */
@RestController
@RequestMapping("/api/public/tour-bookings")
@RequiredArgsConstructor
public class PublicTourBookingController {

    private final PublicBookingService publicBookingService;

    @PostMapping
    public ResponseEntity<PublicTourBookingResponse> createTourBooking(
            @Valid @RequestBody PublicTourBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(publicBookingService.createTourBooking(request));
    }
}
