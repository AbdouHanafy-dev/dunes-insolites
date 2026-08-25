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
                "http://79.143.185.33:4200",  // partner-app (IP, pre-domain testing)
                "http://79.143.185.33:4201",  // admin-app (IP, pre-domain testing)
                "http://79.143.185.33:4202",  // camping-app (IP, pre-domain testing)
                "http://admin.dunesinsolites.com",
                "https://admin.dunesinsolites.com",
                "http://partner.dunesinsolites.com",
                "https://partner.dunesinsolites.com",
                "http://camping.dunesinsolites.com",
                "https://camping.dunesinsolites.com",
                "https://www.dunesinsolites.com",
                "https://dunesinsolites.com",
                "https://www.dunes-insolites.com",  // separate, already-deployed platform
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
