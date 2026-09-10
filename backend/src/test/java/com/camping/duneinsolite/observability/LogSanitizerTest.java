package com.camping.duneinsolite.observability;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LogSanitizerTest {

    @Test
    void masksTheLocalPartButKeepsEnoughToCorrelate() {
        assertThat(LogSanitizer.maskEmail("jane.doe@example.com")).isEqualTo("j***e@example.com");
        assertThat(LogSanitizer.maskEmail("ab@x.com")).isEqualTo("a*@x.com");
        assertThat(LogSanitizer.maskEmail("a@x.com")).isEqualTo("*@x.com");
    }

    @Test
    void neverEchoesGarbageOrNull() {
        assertThat(LogSanitizer.maskEmail(null)).isEqualTo("<redacted>");
        assertThat(LogSanitizer.maskEmail("")).isEqualTo("<redacted>");
        assertThat(LogSanitizer.maskEmail("not-an-email")).isEqualTo("<redacted>");
        assertThat(LogSanitizer.maskEmail("@x.com")).isEqualTo("<redacted>");
    }

    @Test
    void phoneKeepsOnlyTheLastTwoDigits() {
        assertThat(LogSanitizer.maskPhone("+216 50 123 489")).isEqualTo("****89");
        assertThat(LogSanitizer.maskPhone(null)).isEqualTo("<redacted>");
        assertThat(LogSanitizer.maskPhone("x")).isEqualTo("****");
    }
}
