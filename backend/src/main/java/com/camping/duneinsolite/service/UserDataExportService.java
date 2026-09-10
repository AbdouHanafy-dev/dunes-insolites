package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.*;
import com.camping.duneinsolite.mapper.NotificationMapper;
import com.camping.duneinsolite.mapper.ReviewMapper;
import com.camping.duneinsolite.mapper.TransactionMapper;
import com.camping.duneinsolite.mapper.UserMapper;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.security.CallerContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Assembles a {@link UserDataExport} for the authenticated caller — GDPR
 * Art. 15 / Art. 20. Every query is keyed by the JWT subject resolved through
 * {@link CallerContext#requireUserId()}; no id is ever taken from the request,
 * so the export cannot be redirected to another user.
 */
@Service
@RequiredArgsConstructor
public class UserDataExportService {

    private final CallerContext caller;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final ReservationService reservationService;
    private final InvoiceService invoiceService;
    private final TransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;
    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final ReviewRepository reviewRepository;
    private final ReviewMapper reviewMapper;
    private final NewsletterSubscriberRepository newsletterSubscriberRepository;

    @Transactional(readOnly = true)
    public UserDataExport exportForCurrentUser() {
        UUID userId = caller.requireUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException(
                        "Authenticated user not found."));

        List<ReservationResponse> reservations = reservationService.getReservationsByUser(userId);
        List<InvoiceResponse> invoices = invoiceService.getInvoicesByUser(userId);
        List<TransactionResponse> transactions = transactionRepository
                .findByReservation_User_UserIdOrderByTransactionDateDesc(userId).stream()
                .map(transactionMapper::toResponse).toList();
        List<NotificationResponse> notifications = notificationRepository
                .findByUser_UserIdOrderByCreatedAtDesc(userId).stream()
                .map(notificationMapper::toResponse).toList();
        List<ReviewResponse> reviews = reviewRepository
                .findByUser_UserIdOrderByCreatedAtDesc(userId).stream()
                .map(reviewMapper::toResponse).toList();

        UserDataExport.Newsletter newsletter = newsletterSubscriberRepository
                .findByEmail(user.getEmail().trim().toLowerCase())
                .map(s -> new UserDataExport.Newsletter(true, s.getSubscribedAt()))
                .orElse(new UserDataExport.Newsletter(false, null));

        return new UserDataExport(
                Instant.now(),
                userMapper.toResponse(user),
                reservations,
                invoices,
                transactions,
                notifications,
                reviews,
                newsletter);
    }
}
