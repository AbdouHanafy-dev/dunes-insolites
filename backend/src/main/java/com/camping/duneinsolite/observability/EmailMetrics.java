package com.camping.duneinsolite.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Micrometer counters for the transactional-email pipeline. Dot-named per
 * Micrometer convention; the Prometheus exporter renders them as
 * {@code email_dispatch_total{result="..."}} and
 * {@code email_dead_letter_total{action="..."}} (verified in
 * EmailReliabilityIntegrationTest against /actuator/prometheus).
 */
@Component
public class EmailMetrics {

    private final Counter dispatchSent;
    private final Counter dispatchFailed;
    private final Counter dispatchSkippedDuplicate;
    private final Counter deadLetterRecorded;
    private final Counter deadLetterReplayed;
    private final Counter deadLetterDiscarded;

    public EmailMetrics(MeterRegistry registry) {
        this.dispatchSent = Counter.builder("email.dispatch")
                .tag("result", "sent").register(registry);
        this.dispatchFailed = Counter.builder("email.dispatch")
                .tag("result", "failed").register(registry);
        this.dispatchSkippedDuplicate = Counter.builder("email.dispatch")
                .tag("result", "skipped_duplicate").register(registry);
        this.deadLetterRecorded = Counter.builder("email.dead_letter")
                .tag("action", "recorded").register(registry);
        this.deadLetterReplayed = Counter.builder("email.dead_letter")
                .tag("action", "replayed").register(registry);
        this.deadLetterDiscarded = Counter.builder("email.dead_letter")
                .tag("action", "discarded").register(registry);
    }

    public void emailSent()              { dispatchSent.increment(); }
    public void emailFailed()            { dispatchFailed.increment(); }
    public void emailSkippedDuplicate()  { dispatchSkippedDuplicate.increment(); }
    public void deadLetterRecorded()     { deadLetterRecorded.increment(); }
    public void deadLetterReplayed()     { deadLetterReplayed.increment(); }
    public void deadLetterDiscarded()    { deadLetterDiscarded.increment(); }
}
