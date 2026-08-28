package com.camping.duneinsolite.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

/**
 * Serves uploaded media files straight off local disk at /media/**,
 * matching MediaServiceImpl's `app.upload-dir` — Spring's static resource
 * handler gets caching/ETags/range-requests for free; a hand-rolled byte
 * stream in a controller wouldn't. See SecurityConfig for the matching
 * permitAll on GET /media/**.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(uploadDir).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/media/**").addResourceLocations(location);
    }
}
