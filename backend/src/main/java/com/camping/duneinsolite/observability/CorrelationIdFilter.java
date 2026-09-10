package com.camping.duneinsolite.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Reads {@code X-Correlation-Id} from the incoming request (or mints one),
 * binds it to MDC for the request thread, and echoes it back on the response so
 * a caller - or nginx - can stitch client and server logs together.
 *
 * <p>Plain servlet filter, auto-registered as a {@code @Component}; runs before
 * the security chain so even rejected requests are traceable.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class CorrelationIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String incoming = request.getHeader(CorrelationId.HTTP_HEADER);
        String id = (incoming != null && !incoming.isBlank()) ? incoming.trim() : CorrelationId.newId();
        // Cap length so a hostile header can't bloat every log line / DB column.
        if (id.length() > 64) {
            id = id.substring(0, 64);
        }

        MDC.put(CorrelationId.MDC_KEY, id);
        response.setHeader(CorrelationId.HTTP_HEADER, id);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(CorrelationId.MDC_KEY);
        }
    }
}
