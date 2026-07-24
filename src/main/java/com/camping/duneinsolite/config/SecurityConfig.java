package com.camping.duneinsolite.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        // ── PUBLIC ──────────────────────────────────────
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/currency/rates").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()

                        // /active must stay authenticated - declared BEFORE the {id} wildcard
                        // permitAll rules below, otherwise "active" would match as a path
                        // variable and become public too (first-match-wins in this chain)
                        .requestMatchers(HttpMethod.GET, "/api/tours/active").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/extras/active").authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/tours", "/api/tours/{tourId}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/tour-types", "/api/tour-types/{tourTypeId}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/extras", "/api/extras/{extraId}").permitAll()

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

    @Bean
    public JwtDecoder jwtDecoder() {
        String jwkSetUri = keycloakServerUrl + "/realms/" + realm + "/protocol/openid-connect/certs";
        return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
    }
}
