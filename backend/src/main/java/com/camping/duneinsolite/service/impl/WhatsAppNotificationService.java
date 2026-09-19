package com.camping.duneinsolite.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Sends the "your reservation was accepted" WhatsApp message — the same
 * moment {@link EmailService#sendReservationAcceptedEmail} fires, so a guest
 * gets both. No WhatsApp Business API account exists yet (Twilio or Meta
 * Cloud API — see CLAUDE.md's outstanding-credentials section for the same
 * situation with the Gmail app password): this is a stub that logs the
 * message it would have sent and returns, so the reservation-confirm flow
 * never fails or blocks on it.
 *
 * <p>To go live: get a WhatsApp Business API account (Twilio's WhatsApp API
 * or Meta's Cloud API both work — Twilio is the faster path since it
 * doesn't require Meta Business verification), put its credentials in
 * {@code backend/.env} (never in code or chat), and replace the body of
 * {@link #sendReservationAccepted} with the real API call. The method
 * signature and call site ({@code ReservationServiceImpl#onConfirmed}) do
 * not need to change.
 */
@Slf4j
@Service
public class WhatsAppNotificationService {

    @Value("${app.whatsapp.enabled:false}")
    private boolean enabled;

    public void sendReservationAccepted(String phone, String name, String groupName) {
        if (!enabled) {
            log.info("WhatsApp notification stub — no API account configured yet, would send to {}: "
                            + "\"Bonjour {}, votre réservation pour le groupe \\\"{}\\\" a été acceptée.\"",
                    maskPhone(phone), name, groupName);
            return;
        }
        // Unreachable until app.whatsapp.enabled is turned on by a real
        // integration — see class Javadoc.
        log.warn("app.whatsapp.enabled=true but no real WhatsApp API client is wired up yet — message to {} not sent",
                maskPhone(phone));
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) return "(no phone on file)";
        String digits = phone.replaceAll("\\s+", "");
        return digits.length() <= 4 ? "***" : "***" + digits.substring(digits.length() - 4);
    }
}
