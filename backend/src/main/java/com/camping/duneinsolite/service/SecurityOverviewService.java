package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.SecurityEndpointResponse;

import java.util.List;

public interface SecurityOverviewService {

    /**
     * Every controller method Spring MVC has registered, with whatever
     * {@code @PreAuthorize} expression (method-level, falling back to
     * class-level) actually guards it - or {@code null} when there is
     * none, meaning the endpoint's only protection is whatever URL-level
     * rule SecurityConfig assigns it (or, absent that, the blanket
     * {@code anyRequest().authenticated()} at the bottom of the chain).
     */
    List<SecurityEndpointResponse> listEndpoints();
}
