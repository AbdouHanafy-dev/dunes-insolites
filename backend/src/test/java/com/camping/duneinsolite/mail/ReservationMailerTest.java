package com.camping.duneinsolite.mail;

import com.camping.duneinsolite.mail.ReservationMailer.PayKind;
import com.camping.duneinsolite.mail.ReservationMailer.PayMethod;
import com.camping.duneinsolite.mail.ReservationMailer.PaymentMail;
import com.camping.duneinsolite.mail.ReservationMailer.PaymentReceivedMail;
import com.camping.duneinsolite.model.enums.MailLocale;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReservationMailerTest {

    private JavaMailSender sender;
    private ReservationMailer mailer;

    @BeforeEach
    void setUp() {
        sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
        mailer = new ReservationMailer(sender, new MailMessages());
        ReflectionTestUtils.setField(mailer, "fromAddress", "noreply@test.local");
    }

    private String sentSource() throws Exception {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(captor.capture());
        MimeMessage m = captor.getValue();
        m.saveChanges();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        m.writeTo(out);
        return m.getSubject() + "\n" + out.toString("UTF-8");
    }

    private PaymentMail payment(MailLocale l, PayKind kind, String link) {
        return new PaymentMail("c@test.local", "Sophie", "Groupe Sophie", l, true, kind, "TND",
                new BigDecimal("200.000"), new BigDecimal("40.000"), LocalDate.of(2026, 10, 12),
                link, List.of(PayMethod.ONLINE, PayMethod.CARD, PayMethod.CASH), null);
    }

    @Test
    void depositEmailIsInTheClientsLanguageAndNamesTheAmountAndTheOnSiteMethods() throws Exception {
        mailer.sendPayment(payment(MailLocale.EN, PayKind.DEPOSIT, "https://pay.example.com/x"));
        String mail = sentSource();

        assertThat(mail).contains("Booking confirmed");
        assertThat(mail).contains("A deposit of 40 TND (out of a total of 200 TND)");
        assertThat(mail).contains("https://pay.example.com/x");
        assertThat(mail).contains("Card (terminal) on site").contains("Cash on site");
        assertThat(mail).doesNotContain("Réservation confirmée");
    }

    @Test
    void frenchIsTheDefaultAndNoDepositSaysPayOnArrival() throws Exception {
        mailer.sendPayment(payment(MailLocale.FR, PayKind.NONE, null));
        String mail = sentSource();

        assertThat(mail).contains("Réservation confirmée");
        assertThat(mail).contains("Aucun acompte");
        assertThat(mail).doesNotContain("pay.example.com");
    }

    @Test
    void arabicIsRightToLeft() throws Exception {
        mailer.sendPayment(payment(MailLocale.AR, PayKind.DEPOSIT, null));
        assertThat(sentSource()).contains("dir=3D\"rtl\"").contains("lang=3D\"ar\"");
    }

    @Test
    void paymentReceivedTellsTheClientTheyCanPayTheRestOnSite() throws Exception {
        mailer.sendPaymentReceived(new PaymentReceivedMail("c@test.local", "Sophie", "Groupe Sophie", MailLocale.EN,
                "TND", new BigDecimal("40.000"), new BigDecimal("160.000"), List.of(PayMethod.CARD, PayMethod.CASH)));
        String mail = sentSource();

        assertThat(mail).contains("We have received your payment of 40 TND");
        assertThat(mail).contains("160 TND remains to be paid");
        assertThat(mail).contains("Card (terminal) on site, Cash on site");
    }

    @Test
    void paymentReceivedThatSettlesEverythingSaysSo() throws Exception {
        mailer.sendPaymentReceived(new PaymentReceivedMail("c@test.local", "Sophie", "Groupe Sophie", MailLocale.EN,
                "TND", new BigDecimal("160.000"), BigDecimal.ZERO, List.of(PayMethod.CASH)));
        assertThat(sentSource()).contains("fully paid");
    }
}
