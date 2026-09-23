package com.camping.duneinsolite.mail;

import com.camping.duneinsolite.model.enums.MailLocale;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.Map;
import java.util.Properties;

/**
 * The translated copy of the reservation emails, one UTF-8 properties file
 * per locale under {@code resources/mail/}. Loaded once at startup rather than
 * through {@link java.util.ResourceBundle}, whose default-locale fallback would
 * silently pick the server's language instead of French. A key missing from a
 * locale falls back to French - and MailMessagesTest fails the build if any
 * locale is missing one, so the fallback is a safety net, not a plan.
 *
 * Placeholders are {@code {name}}-style and replaced literally (not
 * MessageFormat, whose apostrophe rules would corrupt French/Italian text).
 */
@Slf4j
@Component
public class MailMessages {

    private final Map<MailLocale, Properties> bundles = new EnumMap<>(MailLocale.class);

    public MailMessages() {
        for (MailLocale locale : MailLocale.values()) {
            bundles.put(locale, load(locale));
        }
    }

    private static Properties load(MailLocale locale) {
        Properties props = new Properties();
        String path = "mail/messages_" + locale.tag() + ".properties";
        try (InputStream in = MailMessages.class.getClassLoader().getResourceAsStream(path)) {
            if (in == null) {
                log.warn("Mail translations missing for locale {} ({})", locale, path);
                return props;
            }
            props.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read " + path, e);
        }
        return props;
    }

    /** Whether the locale's file defines the key itself (no French fallback). */
    boolean defines(MailLocale locale, String key) {
        return bundles.get(locale).getProperty(key) != null;
    }

    public String text(MailLocale locale, String key) {
        String value = bundles.get(locale).getProperty(key);
        if (value == null) value = bundles.get(MailLocale.FR).getProperty(key);
        if (value == null) throw new IllegalArgumentException("Unknown mail key: " + key);
        return value;
    }

    public String text(MailLocale locale, String key, Map<String, String> vars) {
        String value = text(locale, key);
        for (Map.Entry<String, String> e : vars.entrySet()) {
            value = value.replace("{" + e.getKey() + "}", e.getValue() == null ? "" : e.getValue());
        }
        return value;
    }
}
