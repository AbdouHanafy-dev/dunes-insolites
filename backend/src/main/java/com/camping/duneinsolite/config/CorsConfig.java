package com.camping.duneinsolite.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    // Staging/preview hosts, comma-separated - never the production domains,
    // which stay hardcoded below so this env var can't accidentally widen
    // production CORS by being misconfigured.
    @Value("${app.cors.extra-origins:}")
    private String extraOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        List<String> origins = new ArrayList<>(List.of(
                "https://admin.dunesinsolites.com",
                "https://partner.dunesinsolites.com",
                "https://camping.dunesinsolites.com",
                "https://www.dunesinsolites.com",
                "https://dunesinsolites.com",
                "https://www.dunes-insolites.com",  // separate, already-deployed platform
                "https://dunes-insolites.com"
        ));
        if (!extraOrigins.isBlank()) {
            origins.addAll(Arrays.stream(extraOrigins.split(",")).map(String::trim).toList());
        }
        config.setAllowedOrigins(origins);

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // NOTE: the SSE timeout is NOT configured here.
    //
    // There used to be an @Bean returning an AsyncSupportConfigurer. That did
    // nothing: AsyncSupportConfigurer is a callback object Spring hands to
    // WebMvcConfigurer.configureAsyncSupport(), not a bean it reads. Building
    // one and returning it configured no timeout at all, so the notification
    // stream was silently running on the container default.
    //
    // It is now set declaratively in application.yml:
    //     spring.mvc.async.request-timeout: -1
}
