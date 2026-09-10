package com.camping.duneinsolite.observability;

import org.slf4j.MDC;

import java.util.UUID;

/**
 * One id that follows a unit of work across every boundary it crosses:
 *
 * <pre>
 *   HTTP request  ->  booking  ->  RabbitMQ message  ->  email consumer
 *                                       |                     |
 *                                  (retry / DLQ)         DLQ record  ->  replay
 * </pre>
 *
 * It is carried <b>explicitly</b> - in the {@code X-Correlation-Id} HTTP header,
 * in the {@code NotificationMessage} body, and in the {@code x-correlation-id}
 * AMQP header - never left to MDC to propagate on its own, because MDC does not
 * cross thread pools or the broker. Each entry point copies the id it received
 * into MDC for the duration of its own work (see {@link #scope}) and clears it.
 */
public final class CorrelationId {

    public static final String HTTP_HEADER = "X-Correlation-Id";
    public static final String AMQP_HEADER = "x-correlation-id";
    public static final String MDC_KEY = "correlationId";

    private CorrelationId() {}

    public static String newId() {
        return UUID.randomUUID().toString();
    }

    /** The current id from MDC, or a fresh one if none is set. */
    public static String currentOrNew() {
        String existing = MDC.get(MDC_KEY);
        return (existing != null && !existing.isBlank()) ? existing : newId();
    }

    /**
     * Binds {@code id} (or a fresh one if null/blank) to MDC for the body of the
     * try-with-resources block, restoring the previous value on close. Use at
     * every non-web entry point.
     */
    public static Scope scope(String id) {
        String previous = MDC.get(MDC_KEY);
        MDC.put(MDC_KEY, (id != null && !id.isBlank()) ? id : newId());
        return () -> {
            if (previous != null) {
                MDC.put(MDC_KEY, previous);
            } else {
                MDC.remove(MDC_KEY);
            }
        };
    }

    public interface Scope extends AutoCloseable {
        @Override
        void close();
    }
}
