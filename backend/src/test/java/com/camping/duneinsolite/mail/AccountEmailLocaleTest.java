package com.camping.duneinsolite.mail;

import com.camping.duneinsolite.model.enums.MailLocale;
import com.camping.duneinsolite.service.impl.EmailService;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountEmailLocaleTest {

    private JavaMailSender sender;
    private EmailService service;

    @BeforeEach
    void setUp() {
        sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
        service = new EmailService(sender, new MailMessages());
        ReflectionTestUtils.setField(service, "fromAddress", "noreply@test.local");
        ReflectionTestUtils.setField(service, "frontendUrl", "https://www.dunes-insolites.com");
    }

    private MimeMessage sent() throws Exception {
        ArgumentCaptor<MimeMessage> c = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(c.capture());
        c.getValue().saveChanges();
        return c.getValue();
    }

    private static String html(Object content) throws Exception {
        if (content instanceof Multipart mp) {
            for (int i = 0; i < mp.getCount(); i++) {
                String h = html(mp.getBodyPart(i).getContent());
                if (h != null) return h;
            }
            return null;
        }
        return content instanceof String s && s.startsWith("<!DOCTYPE") ? s : null;
    }

    @Test
    void verificationEmailFollowsTheUsersLanguage() throws Exception {
        service.sendVerificationEmail("a@test.local", "Sophie", "https://x.test/verify?token=1", MailLocale.EN);
        MimeMessage m = sent();
        String h = html(m.getContent());
        assertThat(m.getSubject()).isEqualTo("Confirm your email address — Dunes Insolites");
        assertThat(h).contains("lang=\"en\"").contains("Hello <strong").contains("Sophie").contains("Confirm my email");
        assertThat(h).doesNotContain("Bonjour");
    }

    @Test
    void resetEmailInArabicIsRightToLeft() throws Exception {
        service.sendPasswordResetEmail("a@test.local", "سوفي", "https://x.test/reset?token=1", MailLocale.AR);
        String h = html(sent().getContent());
        assertThat(h).contains("dir=\"rtl\"").contains("lang=\"ar\"");
    }

    @Test
    void unknownLocaleIsFrench() throws Exception {
        service.sendGuestAccountInvitationEmail("a@test.local", "Sophie", "https://x.test/reset?token=1", MailLocale.from("xx"));
        assertThat(sent().getSubject()).isEqualTo("Configurez votre compte — Dunes Insolites");
    }

    @Test
    void theNameCannotInjectHtml() throws Exception {
        service.sendVerificationEmail("a@test.local", "<img src=x onerror=alert(1)>", "https://x.test/v", MailLocale.EN);
        assertThat(html(sent().getContent())).doesNotContain("<img src=x").contains("&lt;img");
    }
}
