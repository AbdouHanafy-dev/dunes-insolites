package com.camping.duneinsolite.dto.response;

/** How many subscribers were just emailed — never a number the admin UI invents. */
public record SendLaunchEmailResponse(int sent) {
}
