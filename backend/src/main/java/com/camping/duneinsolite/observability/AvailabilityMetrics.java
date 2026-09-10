package com.camping.duneinsolite.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Micrometer counters for the accommodation-availability path (Phase 2).
 * Prometheus names: {@code reservation_capacity_check_total{result="..."}},
 * {@code reservation_hold_total{event="..."}}. No high-cardinality labels.
 */
@Component
public class AvailabilityMetrics {

    private final Counter checkAvailable;
    private final Counter checkUnavailable;
    private final Counter checkUnknown;
    private final Counter allocationRejected;
    private final Counter holdCreated;
    private final Counter holdExpired;

    public AvailabilityMetrics(MeterRegistry registry) {
        this.checkAvailable     = Counter.builder("reservation.capacity.check").tag("result", "available").register(registry);
        this.checkUnavailable   = Counter.builder("reservation.capacity.check").tag("result", "unavailable").register(registry);
        this.checkUnknown       = Counter.builder("reservation.capacity.check").tag("result", "unknown").register(registry);
        this.allocationRejected = Counter.builder("reservation.capacity.check").tag("result", "rejected_at_allocation").register(registry);
        this.holdCreated        = Counter.builder("reservation.hold").tag("event", "created").register(registry);
        this.holdExpired        = Counter.builder("reservation.hold").tag("event", "expired").register(registry);
    }

    public void checkAvailable()      { checkAvailable.increment(); }
    public void checkUnavailable()    { checkUnavailable.increment(); }
    public void checkUnknown()        { checkUnknown.increment(); }
    public void allocationRejected()  { allocationRejected.increment(); }
    public void holdCreated()         { holdCreated.increment(); }
    public void holdsExpired(long n)  { holdExpired.increment(n); }
}
