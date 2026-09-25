package com.camping.duneinsolite.audit;

import com.camping.duneinsolite.model.AuditLogEntry;
import com.camping.duneinsolite.observability.CorrelationId;
import com.camping.duneinsolite.service.AuditLogService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.stream.Collectors;

/**
 * Records every authenticated write (POST / PUT / PATCH / DELETE) on the API: who, what,
 * on which record, from where, and how it ended. Written to the audit log AFTER the
 * response is known, so the status code is the real outcome.
 *
 * <p>Ordered after Spring Security's filter chain (order -100), which means the caller
 * is already resolved when this runs: the identity comes from the verified JWT, never
 * from a header or parameter. Requests Security rejects before reaching here (401, or a
 * URL rule's 403) are therefore not logged; a 403 from {@code @PreAuthorize} is.
 *
 * <p>The request body is never read or stored. A failure to write the log is swallowed
 * and logged: auditing must not be able to take an endpoint down.
 */
@Slf4j
@Component
@Order(Ordered.LOWEST_PRECEDENCE - 50)
public class AuditLogFilter extends OncePerRequestFilter {

    private final AuditLogService auditLogService;
    private final AuditEntityLabels labels;

    public AuditLogFilter(AuditLogService auditLogService, AuditEntityLabels labels) {
        this.auditLogService = auditLogService;
        this.labels = labels;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return AuditTarget.of(request.getMethod(), request.getRequestURI()).isEmpty();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        AuditTarget target = AuditTarget.of(request.getMethod(), request.getRequestURI()).orElseThrow();
        boolean authenticated = auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);
        if (!authenticated) {
            chain.doFilter(request, response);
            return;
        }

        // Read the record's name BEFORE the request runs: after a delete it is gone.
        String label = target.action().equals("CREATE") ? null
                : labels.labelFor(target.entityType(), target.entityId()).orElse(null);

        int status = 500;
        try {
            chain.doFilter(request, response);
            status = response.getStatus();
        } finally {
            try {
                auditLogService.record(entry(request, auth, target, label, status));
            } catch (RuntimeException e) {
                log.warn("audit log write failed for {} {}: {}", request.getMethod(), request.getRequestURI(), e.toString());
            }
        }
    }

    private static AuditLogEntry entry(HttpServletRequest request, Authentication auth, AuditTarget target,
                                       String label, int status) {
        Jwt jwt = auth.getPrincipal() instanceof Jwt j ? j : null;
        String roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .sorted()
                .collect(Collectors.joining(","));
        return AuditLogEntry.builder()
                .occurredAt(Instant.now())
                .actorId(cut(jwt != null ? jwt.getSubject() : auth.getName(), 64))
                .actorEmail(cut(jwt != null ? jwt.getClaimAsString("email") : null, 255))
                .actorName(cut(jwt != null ? firstNonBlank(jwt.getClaimAsString("name"),
                        jwt.getClaimAsString("preferred_username")) : null, 255))
                .actorRoles(cut(roles, 255))
                .action(target.action())
                .verb(cut(target.verb(), 80))
                .method(request.getMethod())
                .path(cut(request.getRequestURI(), 500))
                .entityType(cut(target.entityType(), 80))
                .entityId(cut(target.entityId(), 64))
                .entityLabel(cut(label, 255))
                .statusCode(status)
                .ip(cut(clientIp(request), 64))
                .userAgent(cut(request.getHeader("User-Agent"), 300))
                .correlationId(cut(MDC.get(CorrelationId.MDC_KEY), 64))
                .build();
    }

    /**
     * The real client IP as set by the trusted hop in front of us — {@code X-Real-IP},
     * which nginx overwrites (see RateLimitFilter) and the admin BFF forwards from the
     * browser's connection. Falls back to the TCP peer.
     */
    private static String clientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null && !realIp.isBlank() ? realIp.trim() : request.getRemoteAddr();
    }

    private static String firstNonBlank(String a, String b) {
        return a != null && !a.isBlank() ? a : b;
    }

    private static String cut(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
