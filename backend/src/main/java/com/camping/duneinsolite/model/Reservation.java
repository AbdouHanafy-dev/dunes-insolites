package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.Currency;
import com.camping.duneinsolite.model.enums.ArrivalMode;
import com.camping.duneinsolite.model.enums.DepartureCity;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import com.camping.duneinsolite.model.enums.ReservationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

// Soft-deleted rows (deletedAt set) are excluded from every query on this
// entity — finders, JPQL, Specifications — so a deleted reservation can never
// leak back into a list or a capacity check.
@Entity
@Table(name = "reservations")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reservation {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "reservation_id", updatable = false, nullable = false)
    private UUID reservationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "reservation_type", nullable = false)
    private ReservationType reservationType;

    // Nullable — only required for HEBERGEMENT type
    @Column(name = "check_in_date")
    private LocalDate checkInDate;

    // Nullable — only required for HEBERGEMENT type
    @Column(name = "check_out_date")
    private LocalDate checkOutDate;

    // Nullable — only required for EXTRAS type
    @Column(name = "service_date")
    private LocalDate serviceDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "group_name")
    private String groupName;

    @Column(name = "group_leader_name")
    private String groupLeaderName;

    @Column(name = "number_of_adults", nullable = false)
    @Builder.Default
    private Integer numberOfAdults = 0;

    @Column(name = "number_of_children", nullable = false)
    @Builder.Default
    private Integer numberOfChildren = 0;

    @Column(name = "number_of_infants", nullable = false)
    @Builder.Default
    private Integer numberOfInfants = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.PENDING;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // Null for EXTRAS type — stores TourType or Tour total only
    @Column(name = "total_amount")
    private java.math.BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "currency", length = 3)
    @Builder.Default
    private Currency currency = Currency.EUR;

    /** What the guest saw prices in when booking; only the customer e-mails follow it. Null = {@link #currency}. */
    @Enumerated(EnumType.STRING)
    @Column(name = "display_currency", length = 3)
    private Currency displayCurrency;

    @Column(name = "promo_code")
    private String promoCode;

    /** What the promo code took off the circuit price, in percent, frozen at booking time. Null = none. */
    @Column(name = "promo_discount_percent", precision = 5, scale = 2)
    private java.math.BigDecimal promoDiscountPercent;

    /** The partner's commission rate on this booking, frozen at booking time. Null = not set yet. */
    @Column(name = "promo_commission_percent", precision = 5, scale = 2)
    private java.math.BigDecimal promoCommissionPercent;

    @Column(name = "total_extras_amount")
    @Builder.Default
    private java.math.BigDecimal totalExtrasAmount = java.math.BigDecimal.ZERO;

    // Exchange rate (base-currency EUR per unit of `currency`) locked in at the first non-EUR payment.
    // Reused for every conversion afterwards so a reservation never drifts against a
    // later config change.
    @Column(name = "exchange_rate_applied")
    private java.math.BigDecimal exchangeRateApplied;

    @Column(name = "demande_special", columnDefinition = "TEXT")
    private String demandeSpecial;

    // The guest only states whether transport is needed. For TOURS, staff
    // later assign the actual chauffeur/vehicle from the driver directory.
    @Enumerated(EnumType.STRING)
    @Column(name = "arrival_mode", length = 20)
    private ArrivalMode arrivalMode;

    // Where the guest departs from for pickup — only meaningful for TOURS
    // and HEBERGEMENT (an EXTRAS booking has no pickup routing). Null when
    // not applicable or not yet provided.
    @Enumerated(EnumType.STRING)
    @Column(name = "departure_city", length = 20)
    private DepartureCity departureCity;

    // Optional return leg after the stay/tour ends — same DepartureCity
    // catalog as the outbound `departureCity`, reused rather than a second
    // enum, since it is the same set of pickup/drop-off towns either way.
    // The guest may skip this entirely; staff arrange the driver later.
    @Enumerated(EnumType.STRING)
    @Column(name = "return_city", length = 20)
    private DepartureCity returnCity;

    /** A return city the guest typed because theirs is not in the list; priced as an option, see V57. */
    @Column(name = "return_city_other", length = 120)
    private String returnCityOther;

    // Staff-only free text: where the support team meets the guest in the
    // departure city. Written from the backoffice, never by the guest.
    @Column(name = "meet_up_place", length = 255)
    private String meetUpPlace;

    // Client's preferred language(s) for this booking (currently only
    // captured by the Tour public booking form, where staff assign a
    // translating Guide) - lets admin match Guide.languages to the guest
    // instead of guessing from a name. From the admin-managed catalog
    // (SpokenLanguage), not a hardcoded enum - a guest may speak several.
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "reservation_preferred_languages",
            joinColumns = @JoinColumn(name = "reservation_id"),
            inverseJoinColumns = @JoinColumn(name = "language_id"))
    @Builder.Default
    private Set<SpokenLanguage> preferredLanguages = new HashSet<>();

    // Free-text fallback when the guest's language isn't in the catalog yet
    // - surfaced to admin so they know to ask, rather than silently dropping it.
    @Column(name = "other_language_requested")
    private String otherLanguageRequested;

    // Optional payment link (e.g. Konnect/Flouci checkout URL) set by the admin at
    // confirmation time. Sent to the client in the payment-reminder email.
    @Column(name = "payment_link")
    private String paymentLink;

    // Language of every email about this reservation - the site language the
    // client booked in (MailLocale tag). Never null; French when unknown.
    @Column(name = "locale", nullable = false, length = 5)
    @Builder.Default
    private String locale = "fr";

    // What staff asked this client to pay upfront. null = follow the payment
    // policy; zero = no deposit for this booking. Payment status is still
    // derived from recorded transactions, never from this.
    @Column(name = "deposit_amount")
    private java.math.BigDecimal depositAmount;

    // ── Public guest hold (Phase 2) ──────────────────────────────
    // When set, this PENDING reservation is a temporary hold: it consumes
    // accommodation inventory only until this instant, then HoldExpiryJob
    // moves it to EXPIRED. NULL = no expiry (staff-created or legacy PENDING,
    // and every CONFIRMED/CHECKED_IN reservation).
    @Column(name = "hold_expires_at")
    private LocalDateTime holdExpiresAt;

    // ── HEBERGEMENT — TourTypes ───────────────────────────────────
    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReservationTourType> tourTypes = new ArrayList<>();

    // ── TOURS — ReservationTour ───────────────────────────────────
    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReservationTour> tours = new ArrayList<>();

    // ── Participants ──────────────────────────────────────────────
    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Participant> participants = new ArrayList<>();

    // ── Extras ────────────────────────────────────────────────────
    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReservationExtra> extras = new ArrayList<>();

    // ── Service options (guide, transport/pickup) ──────────────────
    // Folded into totalExtrasAmount below rather than its own total field -
    // same "everything beyond the core accommodation/tour price" bucket
    // extras already occupies, avoiding a new field rippling through
    // currency conversion / invoicing, which already only know about
    // totalAmount/totalExtrasAmount.
    // ── Invoices ──────────────────────────────────────────────────
    //
    // Was cascade = ALL, orphanRemoval = true - the same shape found and
    // fixed on User.reservations/User.invoices (see that file's comment).
    // Nothing exploits this today: ReservationServiceImpl#deleteReservation
    // always soft-deletes (sets deletedAt) rather than calling a hard
    // delete, specifically so invoices keep a valid FK - but that was only
    // ever a convention, not something this mapping enforced. A direct
    // reservationRepository.delete() would have silently cascade-deleted
    // real, numbered invoices exactly like the User bug did. Narrowed the
    // same way, proactively, before anything ever exercised it live.
    @OneToMany(mappedBy = "reservation", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = false)
    @Builder.Default
    private List<Invoice> invoices = new ArrayList<>();

    // ── Transactions ──────────────────────────────────────────────
    // Same fix, same reasoning as invoices above - a real payment record,
    // not something a reservation delete should ever be able to erase.
    @OneToMany(mappedBy = "reservation", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = false)
    @Builder.Default
    private List<Transaction> transactions = new ArrayList<>();

    // ── Source (OneToOne) ─────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_ref_id")
    private Source sourceRef;

    // ── Guides ────────────────────────────────────────────────────
    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Guide> guides = new ArrayList<>();

    // ── Chauffeurs ────────────────────────────────────────────────
    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Chauffeur> chauffeurs = new ArrayList<>();

    // Client-supplied idempotency key for public booking creation (V7). One
    // UUID per booking attempt from the vitrine; re-used on a network retry so
    // the retry returns the SAME reservation instead of creating a duplicate
    // (and a duplicate hold). Null for staff-created and legacy reservations.
    // Partial unique index ux_reservations_idempotency_key.
    @Column(name = "idempotency_key", length = 64, updatable = false)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Null until the reservation is edited/changed; set automatically on every update.
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Null unless soft-deleted. Set by ReservationServiceImpl#deleteReservation instead
    // of a hard DELETE, so financial documents (invoices/transactions) keep a valid FK.
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReservationRepartition> repartitions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ── Helper methods ────────────────────────────────────────────

    public void addTourType(ReservationTourType tourType) {
        tourTypes.add(tourType);
        tourType.setReservation(this);
    }

    public void removeTourType(ReservationTourType tourType) {
        tourTypes.remove(tourType);
        tourType.setReservation(null);
    }

    public void addTour(ReservationTour tour) {
        tours.add(tour);
        tour.setReservation(this);
    }

    public void removeTour(ReservationTour tour) {
        tours.remove(tour);
        tour.setReservation(null);
    }

    public void addParticipant(Participant participant) {
        participants.add(participant);
        participant.setReservation(this);
    }

    public void removeParticipant(Participant participant) {
        participants.remove(participant);
        participant.setReservation(null);
    }

    public void addExtra(ReservationExtra extra) {
        extras.add(extra);
        extra.setReservation(this);
    }

    public void removeExtra(ReservationExtra extra) {
        extras.remove(extra);
        extra.setReservation(null);
    }

    public void addInvoice(Invoice invoice) {
        invoices.add(invoice);
        invoice.setReservation(this);
    }

    public void addTransaction(Transaction transaction) {
        transactions.add(transaction);
        transaction.setReservation(this);
    }

    public java.math.BigDecimal calculateTotalExtrasAmount() {
        java.util.List<java.math.BigDecimal> all = new ArrayList<>(
                extras.stream().map(ReservationExtra::getTotalPrice).toList());
        return com.camping.duneinsolite.money.Money.sum(all);
    }

    public java.math.BigDecimal calculateTotalTourTypesAmount() {
        return com.camping.duneinsolite.money.Money.sum(
                tourTypes.stream().map(ReservationTourType::getTotalPrice).toList());
    }

    /** What the circuits cost before any promo code. */
    public java.math.BigDecimal toursAmountBeforePromo() {
        return com.camping.duneinsolite.money.Money.sum(
                tours.stream().map(ReservationTour::getTotalPrice).toList());
    }

    /** What the promo code takes off the circuit price; zero without a code. Options and activities are never reduced. */
    public java.math.BigDecimal promoDiscountAmount() {
        if (promoDiscountPercent == null || promoDiscountPercent.signum() <= 0) {
            return com.camping.duneinsolite.money.Money.ZERO;
        }
        return com.camping.duneinsolite.money.Money.multiply(toursAmountBeforePromo(), promoDiscountPercent.movePointLeft(2));
    }

    /** The circuits' price after the promo code: every recalculation goes through here, so the discount is never lost. */
    public java.math.BigDecimal calculateTotalToursAmount() {
        return com.camping.duneinsolite.money.Money.subtract(toursAmountBeforePromo(), promoDiscountAmount());
    }
    public void addGuide(Guide guide) {
        guides.add(guide);
        guide.setReservation(this);
    }

    public void removeGuide(Guide guide) {
        guides.remove(guide);
        guide.setReservation(null);
    }

    public void addChauffeur(Chauffeur chauffeur) {
        chauffeurs.add(chauffeur);
        chauffeur.setReservation(this);
    }

    public void removeChauffeur(Chauffeur chauffeur) {
        chauffeurs.remove(chauffeur);
        chauffeur.setReservation(null);
    }

    public void addRepartition(ReservationRepartition r) {
        repartitions.add(r);
        r.setReservation(this);
    }

    public void removeRepartition(ReservationRepartition r) {
        repartitions.remove(r);
        r.setReservation(null);
    }
}
