package com.camping.duneinsolite.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;

/**
 * Enables {@code @Scheduled} (the hold-expiry job, Phase 2) and provides an
 * injectable {@link Clock} so time-dependent domain logic — hold creation,
 * expiry checks — can be driven deterministically in tests instead of calling
 * {@code Instant.now()} directly.
 *
 * <p>New Phase 2 code takes {@code Clock}; the wider codebase still uses
 * {@code LocalDateTime.now()} and is not being refactored in this phase.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
