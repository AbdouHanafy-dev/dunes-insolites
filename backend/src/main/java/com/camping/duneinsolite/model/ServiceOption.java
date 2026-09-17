package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.PricingUnit;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * A guide or transport/pickup add-on the guest picks and pays for during
 * the "Getting There & Guide" booking step - "Guide with Support Vehicle",
 * "Hotel Pickup", etc. Deliberately its own catalogue entity rather than a
 * new {@code Extra}: unlike an activity (single day, quantity = units
 * consumed that day), this needs a pricing unit that can be per-day,
 * per-booking, per-person or per-vehicle, plus pickup-specific fields that
 * would have no meaning on an activity like sandboarding.
 *
 * <p>Not named "Guide" - that already means an internally-assigned staff
 * member on a confirmed reservation (see {@link Guide}), a completely
 * different, unpriced, staff-only concept. Reusing the name here would
 * have been a real source of confusion.
 *
 * <p>{@code type} is a free-text label ("GUIDE_WITH_SUPPORT_VEHICLE",
 * "HOTEL_PICKUP", ...), not a Java enum - the brief is explicit that the
 * business must be able to add new kinds of guide/transport options from
 * the backoffice without a code deploy. {@code category} is the one fixed
 * structural fact the booking wizard branches on (GUIDE is always offered;
 * TRANSPORT only when the guest has no vehicle).
 */
@Entity
@Table(name = "service_options")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceOption {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "slug", nullable = false, unique = true)
    private String slug;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private ServiceOptionCategory category;

    /** Free-text kind within the category - see class javadoc. */
    @Column(name = "type", nullable = false)
    private String type;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_unit", nullable = false)
    private PricingUnit pricingUnit;

    /** TTC. Null = not configured → not bookable, same convention as AccommodationType. */
    @Column(name = "unit_price_ttc", precision = 15, scale = 3)
    private BigDecimal unitPriceTtc;

    @Column(name = "tva_rate", precision = 6, scale = 3)
    @Builder.Default
    private BigDecimal tvaRate = BigDecimal.ZERO;

    /** Total units (guides, support vehicles, transport seats...) available per day. Null = no ceiling. */
    @Column(name = "max_units_per_day")
    private Integer maxUnitsPerDay;

    /** True when the guest must supply pickup details (hotel/airport/address/instructions) to book this. */
    @Column(name = "requires_pickup_location", nullable = false)
    @Builder.Default
    private boolean requiresPickupLocation = false;

    /**
     * True only for a GUIDE option that rides along in the guest's own
     * vehicle - mutually exclusive with any TRANSPORT-category option on
     * the same reservation (a guest driving themselves has no pickup need).
     */
    @Column(name = "requires_customer_vehicle", nullable = false)
    @Builder.Default
    private boolean requiresCustomerVehicle = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    /** True when this option has everything it needs to be booked. */
    @Transient
    public boolean isBookable() {
        return active && unitPriceTtc != null;
    }
}
