package com.camping.duneinsolite.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window rate limiter for the unauthenticated public write endpoints
 * (DI-015) - guest checkout (DI-013) and self-registration have no other
 * defense against a script hammering them. In-memory, single instance only
 * (matches today's one-backend-container deployment, see
 * backend/docker-compose.yml) - move to Redis if the backend is ever scaled
 * horizontally, since these counters aren't shared across instances.
 *
 * Deliberately NOT a @Component: it's instantiated once by SecurityConfig
 * and wired into the security filter chain directly via addFilterBefore.
 * Registering it as a bean as well would make Spring Boot ALSO
 * auto-register it as a generic servlet filter, running it twice per
 * request and double-counting every window.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private record Limit(String path, String method, int maxRequests, long windowMillis) {
    }

    private static final List<Limit> LIMITS = List.of(
            new Limit("/api/public/bookings", "POST", 10, 60_000),
            new Limit("/api/public/stay-bookings", "POST", 10, 60_000),
            new Limit("/api/public/tour-bookings", "POST", 10, 60_000),
            new Limit("/api/auth/register", "POST", 5, 60_000),
            new Limit("/api/auth/login", "POST", 10, 60_000),
            // Contact/newsletter (SEO/vitrine audit fix) - unauthenticated,
            // free-text input reaching either a real inbox (contact) or a
            // real DB table (newsletter), same abuse shape as the others above.
            new Limit("/api/public/contact", "POST", 5, 60_000),
            new Limit("/api/public/subscribe", "POST", 5, 60_000)
    );

    private static final class Window {
        private final AtomicInteger count;
        private final long windowStart;

        private Window(int initialCount, long windowStart) {
            this.count = new AtomicInteger(initialCount);
            this.windowStart = windowStart;
        }
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        Limit limit = LIMITS.stream()
                .filter(l -> l.method().equalsIgnoreCase(request.getMethod())
                        && request.getRequestURI().equals(l.path()))
                .findFirst()
                .orElse(null);

        if (limit == null) {
            chain.doFilter(request, response);
            return;
        }

        String key = limit.path() + "|" + clientIp(request);
        long now = System.currentTimeMillis();

        int countAfterThisRequest = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart >= limit.windowMillis()) {
                return new Window(1, now);
            }
            existing.count.incrementAndGet();
            return existing;
        }).count.get();

        if (countAfterThisRequest > limit.maxRequests()) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"status\":429,\"message\":\"Too many requests - please try again in a minute.\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    /**
     * The real client IP as set BY the reverse proxy — never a client-supplied
     * header. nginx sets {@code X-Real-IP} to {@code $remote_addr} (the TCP peer
     * it saw) and overwrites any client value, so it is trustworthy here.
     * {@code X-Forwarded-For}'s leftmost element IS client-controlled — trusting
     * it let an attacker rotate the header to reset the per-IP window and
     * bypass this limit (security assessment 2026-09-10).
     */
    private String clientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
