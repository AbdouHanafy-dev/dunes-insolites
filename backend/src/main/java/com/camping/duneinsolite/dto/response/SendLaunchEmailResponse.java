package com.camping.duneinsolite.dto.response;

/**
 * How many subscribers were actually emailed, and how many attempts
 * failed (e.g. a bad SMTP credential) and stay pending for the next
 * press — never numbers the admin UI invents.
 */
public record SendLaunchEmailResponse(int sent, int failed) {
}
