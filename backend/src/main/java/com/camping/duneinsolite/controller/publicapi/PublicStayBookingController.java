package com.camping.duneinsolite.controller.publicapi;

import com.camping.duneinsolite.dto.request.publicapi.PublicStayBookingRequest;
import com.camping.duneinsolite.dto.response.publicapi.PublicStayBookingResponse;
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
 * Guest checkout for a nuitée booking (DI-013) - no login step. See
 * SecurityConfig - this specific path is permitAll.
 */
@RestController
@RequestMapping("/api/public/stay-bookings")
@RequiredArgsConstructor
public class PublicStayBookingController {

    private final PublicBookingService publicBookingService;

    @PostMapping
    public ResponseEntity<PublicStayBookingResponse> createStayBooking(
            @Valid @RequestBody PublicStayBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(publicBookingService.createStayBooking(request));
    }
}
