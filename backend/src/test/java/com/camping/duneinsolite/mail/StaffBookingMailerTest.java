package com.camping.duneinsolite.mail;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StaffBookingMailerTest {

    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final StaffBookingMailer mailer = new StaffBookingMailer(sender);

    private static ReservationOverview overview() {
        return new ReservationOverview("DI-4650DE2C", LocalDate.of(2026, 10, 5), null, 2, 1, 0,
                List.of(new ReservationOverview.Item("Tunisie : escapade de 2 jours", "")),
                new BigDecimal("234.000"), List.of(new ReservationOverview.Extra("Quad", "x 2", new BigDecimal("70"))),
                new BigDecimal("234.000"), BigDecimal.ZERO, new BigDecimal("234.000"), "EUR");
    }

    private static final StaffBookingMailer.Customer CUSTOMER =
            new StaffBookingMailer.Customer("Clément Masserot", "client@example.com", "+33 7 72 13 84 03", "Français");

    @Test
    void theNewBookingEmailCarriesWhatTheTeamNeedsToActOnTheBooking() {
        String html = mailer.html(StaffBookingMailer.Kind.NEW, overview(), CUSTOMER, "https://admin.example.com/reservations/abc");

        assertThat(html).contains("Vous avez reçu une réservation")
                .contains("Tunisie : escapade de 2 jours")
                .contains("DI-4650DE2C")
                .contains("5 octobre 2026")
                .contains("2 adultes · 1 enfant")
                .contains("Clément Masserot")
                .contains("mailto:client@example.com")
                .contains("tel:+33772138403")
                .contains("Langue : Français")
                .contains("Quad x 2")
                .contains("234,00 €")
                .contains("Accéder à la réservation")
                .contains("href=\"https://admin.example.com/reservations/abc\"");
    }

    @Test
    void confirmedAndCancelledCarryTheirOwnWording() {
        String confirmed = mailer.html(StaffBookingMailer.Kind.CONFIRMED, overview(), CUSTOMER, "https://admin.example.com/r/abc");
        String cancelled = mailer.html(StaffBookingMailer.Kind.CANCELLED, overview(), CUSTOMER, "https://admin.example.com/r/abc");

        assertThat(confirmed).contains("Réservation confirmée").contains("a été confirmée");
        assertThat(cancelled).contains("Réservation annulée").contains("a été annulée");
    }

    @Test
    void whatTheGuestTypedIsEscapedInTheHtml() {
        var evil = new StaffBookingMailer.Customer("<script>alert(1)</script>", "a@b.c", null, null);
        String html = mailer.html(StaffBookingMailer.Kind.NEW, overview(), evil, "https://admin.example.com/reservations/abc");

        assertThat(html).doesNotContain("<script>alert(1)</script>").contains("&lt;script&gt;");
    }

    @Test
    void thePlainTextPartHasTheSameFacts() {
        String text = mailer.text(StaffBookingMailer.Kind.NEW, overview(), CUSTOMER, "https://admin.example.com/reservations/abc");

        assertThat(text).contains("DI-4650DE2C").contains("Clément Masserot <client@example.com>")
                .contains("https://admin.example.com/reservations/abc");
    }

    @Test
    void oneMessageGoesToEveryTeamAddress() throws Exception {
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);

        mailer.send(List.of("owner@example.com", "camp@example.com"), StaffBookingMailer.Kind.NEW, overview(), CUSTOMER, "https://admin.example.com/r/1");

        verify(sender).send(any(MimeMessage.class));
        assertThat(message.getAllRecipients()).hasSize(2);
        assertThat(message.getSubject()).startsWith("Nouvelle réservation : Tunisie : escapade de 2 jours")
                .contains("DI-4650DE2C");
    }

    @Test
    void confirmedAndCancelledSubjectsReplyToTheSameThreadAsTheNewBookingMail() throws Exception {
        MimeMessage newMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(newMessage);
        mailer.send(List.of("owner@example.com"), StaffBookingMailer.Kind.NEW, overview(), CUSTOMER, "https://admin.example.com/r/1");
        String newSubject = newMessage.getSubject();

        MimeMessage confirmedMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(confirmedMessage);
        mailer.send(List.of("owner@example.com"), StaffBookingMailer.Kind.CONFIRMED, overview(), CUSTOMER, "https://admin.example.com/r/1");

        MimeMessage cancelledMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(cancelledMessage);
        mailer.send(List.of("owner@example.com"), StaffBookingMailer.Kind.CANCELLED, overview(), CUSTOMER, "https://admin.example.com/r/1");

        // Same core subject, only prefixed with "Re: " - the piece Gmail (and other clients) thread on.
        assertThat(confirmedMessage.getSubject()).isEqualTo("Re: " + newSubject);
        assertThat(cancelledMessage.getSubject()).isEqualTo("Re: " + newSubject);
    }
}
