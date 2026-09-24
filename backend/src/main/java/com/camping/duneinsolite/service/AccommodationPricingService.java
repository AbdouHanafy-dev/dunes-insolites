package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.AccommodationPricingException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.PricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.PricingRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * The one authority on what an accommodation booking costs. The client sends
 * only a tier, a unit count and who sleeps there; every price comes from here.
 *
 * <p>A tier is priced <b>per person per night</b>, one price per guest type
 * (adult, child, infant). Infants are priced like everyone else (free while
 * the back office leaves theirs at 0) but never count toward the tier's
 * capacity.
 *
 * <p>Fails closed: an unpriced or inactive tier, or a party that does not fit,
 * throws — no booking is created.
 */
@Service
@RequiredArgsConstructor
public class AccommodationPricingService {

    private final AccommodationTypeRepository repository;
    private final PricingRuleRepository pricingRuleRepository;

    /** Who sleeps somewhere: adults (18+), children (3-18) and infants (0-3). */
    public record Guests(int adults, int children, int infants) {
        public Guests {
            if (adults < 0 || children < 0 || infants < 0) {
                throw new AccommodationPricingException("Guest counts cannot be negative.");
            }
        }

        /** Guests that take a place: infants do not. */
        public int seated() {
            return adults + children;
        }
    }

    /**
     * @param adultPrice/childPrice/infantPrice per person per night at booking
     *        time — persisted, never re-read, so a later catalogue change cannot
     *        move an existing reservation's total
     */
    public record PricedAccommodation(
            UUID accommodationTypeId,
            String name,
            int units,
            Guests guests,
            BigDecimal adultPrice,
            BigDecimal childPrice,
            BigDecimal infantPrice,
            BigDecimal tvaRate,
            BigDecimal lineTotalTtc,
            BigDecimal lineTotalHt,
            BigDecimal lineTotalTva
    ) {}

    /**
     * Splits the party across the tiers a booking picked. One tier: the whole
     * party sleeps there. Several tiers: each must say who sleeps in it, and the
     * tiers together must add up to the party exactly.
     *
     * @param requested one entry per tier, {@code null} where the tier did not say
     */
    public static List<Guests> splitGuests(List<Guests> requested, Guests party) {
        if (requested.size() == 1) return List.of(party);
        int adults = 0, children = 0, infants = 0;
        List<Guests> out = new ArrayList<>();
        for (Guests g : requested) {
            if (g == null) {
                throw new AccommodationPricingException(
                        "Tell us who sleeps in each accommodation when you choose more than one.");
            }
            adults += g.adults();
            children += g.children();
            infants += g.infants();
            out.add(g);
        }
        if (adults != party.adults() || children != party.children() || infants != party.infants()) {
            throw new AccommodationPricingException(
                    "The guests assigned to the accommodations (" + adults + " adults, " + children + " children, "
                            + infants + " infants) must add up to your party (" + party.adults() + ", "
                            + party.children() + ", " + party.infants() + ").");
        }
        return out;
    }

    /**
     * @param date the stay's check-in date — every nuitée today is exactly one
     *             night (see PublicBookingServiceImpl), so a single date is
     *             enough to resolve which price applies; there is no
     *             per-night iteration to do.
     */
    @Transactional(readOnly = true)
    public PricedAccommodation resolveBySlug(UUID tourTypeId, String slug, int units, int nights, Guests guests, LocalDate date) {
        AccommodationType acc = repository.findByTourTypeAndSlug(tourTypeId, slug)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Accommodation not found for this stay: " + slug));
        return resolve(acc, units, nights, guests, date);
    }

    @Transactional(readOnly = true)
    public PricedAccommodation resolveById(UUID accommodationTypeId, int units, int nights, Guests guests, LocalDate date) {
        AccommodationType acc = repository.findById(accommodationTypeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Accommodation not found: " + accommodationTypeId));
        return resolve(acc, units, nights, guests, date);
    }

    /**
     * Whether {@code guests} still fit in {@code units} of a tier, without repricing it. Used when a booking's
     * party is edited and the tier's snapshot prices are carried forward.
     */
    @Transactional(readOnly = true)
    public void assertFits(UUID accommodationTypeId, int units, Guests guests) {
        AccommodationType acc = repository.findById(accommodationTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Accommodation not found: " + accommodationTypeId));
        if (guests.seated() < 1 || (long) units * acc.getCapacity() < guests.seated()) {
            throw new AccommodationPricingException(
                    units + " × \"" + acc.getName() + "\" sleeps " + (units * acc.getCapacity())
                            + " — not enough for " + guests.seated() + " guests (infants not counted).");
        }
    }

    private PricedAccommodation resolve(AccommodationType acc, int units, int nights, Guests guests, LocalDate date) {
        if (!acc.isActive()) {
            throw new AccommodationPricingException(
                    "\"" + acc.getName() + "\" is no longer available.");
        }
        if (acc.getAdultPriceTtc() == null) {
            throw new AccommodationPricingException(
                    "\"" + acc.getName() + "\" can't be booked online yet — please contact the camp to reserve it.");
        }
        if (units < 1) {
            throw new AccommodationPricingException("Choose at least one " + acc.getName() + ".");
        }
        if (guests.seated() < 1) {
            throw new AccommodationPricingException("Assign at least one guest to \"" + acc.getName() + "\".");
        }
        int nightsSafe = Math.max(nights, 1);
        if ((long) units * acc.getCapacity() < guests.seated()) {
            throw new AccommodationPricingException(
                    units + " × \"" + acc.getName() + "\" sleeps " + (units * acc.getCapacity())
                            + " — not enough for " + guests.seated() + " guests (infants not counted).");
        }

        BigDecimal adult = Money.round(resolveAdultPrice(acc, date));
        // A date or period rule sets the adult price; child and infant follow it
        // by the same ratio, so a high-season uplift applies to everyone.
        BigDecimal ratio = ratioToStandard(acc, adult);
        BigDecimal child = scaled(acc.getChildPriceTtc() != null ? acc.getChildPriceTtc() : acc.getAdultPriceTtc(), ratio);
        BigDecimal infant = scaled(acc.getInfantPriceTtc() != null ? acc.getInfantPriceTtc() : BigDecimal.ZERO, ratio);

        BigDecimal rate = acc.getTvaRate();
        BigDecimal perNight = Money.add(
                Money.multiply(adult, guests.adults()),
                Money.multiply(child, guests.children()),
                Money.multiply(infant, guests.infants()));
        BigDecimal ttc = Money.multiply(perNight, nightsSafe);
        return new PricedAccommodation(
                acc.getId(), acc.getName(), units, guests, adult, child, infant, rate,
                ttc, Money.htFromTtc(ttc, rate), Money.taxFromTtc(ttc, rate));
    }

    private static BigDecimal ratioToStandard(AccommodationType acc, BigDecimal effectiveAdult) {
        BigDecimal standard = acc.getAdultPriceTtc();
        if (standard.signum() == 0) return BigDecimal.ONE;
        return effectiveAdult.divide(standard, 10, Money.MODE);
    }

    private static BigDecimal scaled(BigDecimal price, BigDecimal ratio) {
        return Money.round(price.multiply(ratio));
    }

    /**
     * DATE rule beats PERIOD rule beats the tier's standard price — the
     * priority order from the pricing brief. Season isn't a rule type yet
     * (see PricingRuleType); when it is, it slots in here between PERIOD
     * and standard. A rule's price is the adult price for that date.
     */
    private BigDecimal resolveAdultPrice(AccommodationType acc, LocalDate date) {
        if (date == null) return acc.getAdultPriceTtc();
        List<PricingRule> covering = pricingRuleRepository.findActiveCovering(acc.getId(), date);
        return covering.stream()
                .filter(r -> r.getRuleType() == PricingRuleType.DATE)
                .findFirst()
                .or(() -> covering.stream().filter(r -> r.getRuleType() == PricingRuleType.PERIOD).findFirst())
                .map(PricingRule::getPriceTtc)
                .orElse(acc.getAdultPriceTtc());
    }
}
