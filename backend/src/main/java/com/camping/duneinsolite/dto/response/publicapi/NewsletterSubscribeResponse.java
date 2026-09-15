package com.camping.duneinsolite.dto.response.publicapi;

/**
 * `position` is the real, current total subscriber count at the moment of
 * this call - shown on the frontend as "you're #N on the list" (on
 * request). Never a number the frontend invents itself.
 */
public record NewsletterSubscribeResponse(long position) {
}
