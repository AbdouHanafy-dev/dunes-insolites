package com.camping.duneinsolite.dto.request;

import lombok.Data;
import java.util.Set;
import java.util.UUID;

@Data
public class GuideStaffRequest {
    // Preferred flow: select one permanent active guide profile. Legacy
    // free-text fields remain accepted for older API clients/imports.
    // The names are only required WITHOUT a profile, so they cannot be
    // @NotBlank here (that rejected every profile-only request, i.e. the
    // back office's own "Affecter" button); ReservationServiceImpl
    // addStaffToReservation enforces "profile or first + last name".
    private UUID guideProfileId;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    // SpokenLanguage ids this guide can translate/guide in — used to match
    // against Reservation.preferredLanguages. Optional; null/empty means unset.
    private Set<UUID> languageIds;
}
