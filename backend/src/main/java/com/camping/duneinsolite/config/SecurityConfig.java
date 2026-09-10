package com.camping.duneinsolite.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {


    @Value("${keycloak.admin.server-url}")
    private String keycloakServerUrl;

    @Value("${keycloak.realm}")
    private String realm;

    // Not a @Component - see RateLimitFilter's class comment for why it's
    // instantiated here rather than autowired.
    private final RateLimitFilter rateLimitFilter = new RateLimitFilter();

    /**
     * Actuator chain. It ONLY has an effect when {@code MANAGEMENT_SERVER_PORT}
     * is set to a port different from {@code server.port}: in that case Spring
     * Boot serves the actuator endpoints exclusively on that private port (the
     * main port returns 404 for {@code /actuator/**}), and this chain lets the
     * Prometheus scraper reach {@code /actuator/prometheus} without a JWT —
     * which is safe only because that port is bound to the internal network /
     * localhost and never published to the internet. See
     * {@code application.yml}'s {@code management.server} block and
     * {@code docs/runbooks/production-monitoring.md}.
     *
     * <p>When {@code MANAGEMENT_SERVER_PORT} is unset (the default) actuator is
     * served on the main port, this matcher still matches those paths, and the
     * effect would be to make {@code /actuator/**} public — so the main chain
     * below keeps its explicit {@code hasRole("ADMIN")} rule and this bean is
     * disabled unless a distinct management port is configured.
     */
    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    @org.springframework.boot.autoconfigure.condition.ConditionalOnExpression(
            "'${management.server.port:}' != '' and '${management.server.port:}' != '${server.port}'")
    public SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher(EndpointRequest.toAnyEndpoint())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .csrf(csrf -> csrf.disable());
        return http.build();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Without this, the CorsConfigurationSource bean in CorsConfig is
                // inert — Spring Security only consults it when the filter chain
                // opts in. Every browser cross-origin request was being rejected.
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .addFilterBefore(rateLimitFilter, BearerTokenAuthenticationFilter.class)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        // ── PUBLIC ──────────────────────────────────────
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                        // Email-verify and password-reset links are the
                        // proof of identity here, not a session - same
                        // reasoning as register/login being public.
                        .requestMatchers(HttpMethod.POST, "/api/auth/verify-email").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/reset-password").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/currency/rates").permitAll()

                        // Health + probes are public (container / load-balancer
                        // checks). show-details is `when-authorized`, so the
                        // public body is only {"status":"UP"} - no component
                        // detail, no leak. Everything else under /actuator
                        // (metrics, prometheus, info) is ADMIN-only, below.
                        .requestMatchers(HttpMethod.GET,
                                "/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")

                        // /active must stay authenticated - declared BEFORE the {id} wildcard
                        // permitAll rules below, otherwise "active" would match as a path
                        // variable and become public too (first-match-wins in this chain)
                        .requestMatchers(HttpMethod.GET, "/api/tours/active").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/extras/active").authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/tours", "/api/tours/{tourId}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/tour-types", "/api/tour-types/{tourTypeId}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/extras", "/api/extras/{extraId}").permitAll()

                        // Vitrine-shaped reads (DI-012) - read-only, no {id} vs "active"
                        // wildcard ambiguity to worry about here, unlike the block above.
                        .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()

                        // Uploaded media files themselves (WebConfig's static mapping) -
                        // a page referencing one in a block image field needs it to load
                        // for every visitor, not just staff. Managing the library
                        // (upload/list/delete, under /api/media) still requires ADMIN.
                        .requestMatchers(HttpMethod.GET, "/media/**").permitAll()

                        // Guest checkout (DI-013) - no login step. Finds/creates the
                        // account server-side; see PublicBookingServiceImpl.
                        .requestMatchers(HttpMethod.POST, "/api/public/bookings", "/api/public/stay-bookings").permitAll()

                        // The vitrine's contact form and newsletter signup (SEO/vitrine
                        // audit fix) - both rate-limited below, same as bookings/register.
                        .requestMatchers(HttpMethod.POST, "/api/public/contact", "/api/public/subscribe").permitAll()

                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        .requestMatchers("/api/camping/**").hasRole("CAMPING")

                        .requestMatchers("/api/partenaire/**").hasRole("PARTENAIRE")

                        .requestMatchers("/api/client/**").hasRole("CLIENT")

                        .requestMatchers("/api/reservations/**").authenticated()

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .bearerTokenResolver(bearerTokenResolver())
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                );

        return http.build();
    }

    /**
     * The native browser EventSource API cannot set custom headers, so it has no way
     * to send "Authorization: Bearer ...". This resolver falls back to an
     * "?access_token=..." query parameter, but only for the SSE subscribe endpoint -
     * everywhere else still requires the header, since putting tokens in URLs is bad
     * practice in general (they end up in logs/history) and this is a narrow,
     * RFC 6750-documented exception for exactly this SSE limitation.
     */
    @Bean
    public BearerTokenResolver bearerTokenResolver() {
        DefaultBearerTokenResolver headerResolver = new DefaultBearerTokenResolver();
        return request -> {
            String token = headerResolver.resolve(request);
            if (token == null && request.getRequestURI().endsWith("/api/notifications/subscribe")) {
                token = request.getParameter("access_token");
            }
            return token;
        };
    }


    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            // Extract realm_access.roles from the JWT
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");

            if (realmAccess == null || !realmAccess.containsKey("roles")) {
                return List.of();
            }

            @SuppressWarnings("unchecked")
            Collection<String> roles = (Collection<String>) realmAccess.get("roles");

            // Map each role to ROLE_XXX (Spring Security convention)
            return roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList());
        });

        return converter;
    }

    // PRODUCTION: set KEYCLOAK_ISSUER_URL to the public token issuer (what a
    // Keycloak-minted token carries in `iss`, e.g.
    // https://auth.dunesinsolites.com/realms/duneinsolite) — distinct from
    // keycloak.admin.server-url, the INTERNAL address the backend fetches the
    // JWK set from. When set, the decoder additionally validates `iss` and the
    // authorized party `azp` (security assessment M-1). Unset (local dev, tests)
    // keeps the lenient signature-+-expiry decoder.
    @Value("${keycloak.issuer-url:}")
    private String issuerUrl;

    @Value("${keycloak.client-id:duneinsolite-api}")
    private String expectedAzp;

    @Bean
    public JwtDecoder jwtDecoder() {
        String jwkSetUri = keycloakServerUrl + "/realms/" + realm + "/protocol/openid-connect/certs";
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();

        if (issuerUrl != null && !issuerUrl.isBlank()) {
            decoder.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                    org.springframework.security.oauth2.jwt.JwtValidators.createDefaultWithIssuer(issuerUrl),
                    jwt -> expectedAzp.equals(jwt.getClaimAsString("azp"))
                            ? org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success()
                            : org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(
                                new org.springframework.security.oauth2.core.OAuth2Error(
                                    "invalid_token", "Unexpected authorized party (azp)", null))));
        }
        return decoder;
    }
}
