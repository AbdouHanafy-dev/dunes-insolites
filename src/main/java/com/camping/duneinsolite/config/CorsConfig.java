package com.camping.duneinsolite.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of(
                "http://localhost:4200",  // admin-app
                "http://localhost:4201",  // camping-app
                "http://localhost:4202",  // partenaire-app
                "https://www.dunes-insolites.com",
                "https://dunes-insolites.com"
        ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
    // add to SecurityConfig or any @Configuration class
    @Bean
    public org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer asyncConfigurer() {
        org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer configurer =
                new org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer();
        configurer.setDefaultTimeout(-1); // no timeout for SSE
        return configurer;
    }
}
