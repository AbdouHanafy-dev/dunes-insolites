package com.camping.duneinsolite.dto.response;

/**
 * One controller method as actually registered with Spring MVC, plus the
 * {@code @PreAuthorize} expression guarding it (if any). Built by reflecting
 * over the live {@code RequestMappingHandlerMapping} - see
 * SecurityOverviewServiceImpl - so this can never drift from the real
 * annotations the way a hand-maintained doc page would.
 */
public record SecurityEndpointResponse(
        String controller,
        String httpMethod,
        String path,
        String rule
) {
}
