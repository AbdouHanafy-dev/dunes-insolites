package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.Currency;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
public class ReservationUpdateRequest {

    // ── Simple fields ──────────────────────────────────────
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private String groupName;
    private String groupLeaderName;
    private String demandeSpecial;
    // null = leave untouched; a set (incl. empty) replaces it.
    private Set<UUID> preferredLanguageIds;
    private String otherLanguageRequested;
    private String promoCode;
    // Language of the client's emails ("fr", "en", ...); null = unchanged.
    private String locale;
   // private Currency currency;
    private Integer numberOfAdults;
    private Integer numberOfChildren;


    // ── Replace lists entirely (send the full desired state) ──
    private List<TourTypeSelectionRequest> tourTypes;     // same DTO as create
    private List<TourSelectionRequest> tours;              // same DTO as create
    private List<ParticipantRequest> participants;         // same DTO as create
    private List<ReservationExtraRequest> extras;          // same DTO as create
    private List<RepartitionRequest> repartitions;

    private LocalDate serviceDate;
}
