package com.camping.duneinsolite.mail;

import com.camping.duneinsolite.model.enums.MailLocale;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class MailMessagesTest {

    private static Properties load(MailLocale l) throws Exception {
        Properties p = new Properties();
        try (InputStream in = MailMessagesTest.class.getClassLoader()
                .getResourceAsStream("mail/messages_" + l.tag() + ".properties")) {
            assertThat(in).as("translation file for " + l).isNotNull();
            p.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return p;
    }

    @Test
    void everyLocaleTranslatesEveryKeyAndKeepsItsPlaceholders() throws Exception {
        Properties fr = load(MailLocale.FR);
        for (MailLocale l : MailLocale.values()) {
            Properties p = load(l);
            assertThat(p.stringPropertyNames()).as("keys of " + l).containsExactlyInAnyOrderElementsOf(fr.stringPropertyNames());
            for (String key : fr.stringPropertyNames()) {
                for (String placeholder : new String[] {"{name}", "{group}", "{amount}", "{total}", "{deadline}",
                        "{date}", "{received}", "{remaining}", "{methods}"}) {
                    assertThat(p.getProperty(key).contains(placeholder))
                            .as(l + " " + key + " placeholder " + placeholder)
                            .isEqualTo(fr.getProperty(key).contains(placeholder));
                }
            }
        }
    }

    @Test
    void placeholdersAreFilledAndApostrophesSurvive() {
        MailMessages m = new MailMessages();
        assertThat(m.text(MailLocale.FR, "pay.none")).contains("n'est demandé");
        assertThat(m.text(MailLocale.EN, "payrcv.lead", Map.of("received", "40 TND", "group", "Sophie")))
                .isEqualTo("We have received your payment of 40 TND for your booking (Sophie). Thank you!");
    }

    @Test
    void unknownOrBlankLocalesFallBackToFrench() {
        assertThat(MailLocale.from(null)).isEqualTo(MailLocale.FR);
        assertThat(MailLocale.from("  ")).isEqualTo(MailLocale.FR);
        assertThat(MailLocale.from("xx")).isEqualTo(MailLocale.FR);
        assertThat(MailLocale.from("en-GB")).isEqualTo(MailLocale.EN);
        assertThat(MailLocale.from("DE")).isEqualTo(MailLocale.DE);
        assertThat(MailLocale.from("ar_TN")).isEqualTo(MailLocale.AR);
    }
}
