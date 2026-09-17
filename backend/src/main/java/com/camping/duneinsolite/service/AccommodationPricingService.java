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
import java.util.List;
import java.util.UUID;

/**
 * The one authority on what an accommodation booking costs. The client sends
 * only a tier and a unit count; every price comes from here.
 *
 * <p>Fails closed: an unpriced or inactive tier, or a party that does not fit,
 * throws — no booking is created.
 */
@Service
@RequiredArgsConstructor
public class AccommodationPricingService {

    private final AccommodationTypeRepository repository;
    private final PricingRuleRepository pricingRuleRepository;

    /**
     * @param snapshotUnitPriceTtc unit price at booking time — persisted, never
     *                             re-read, so a later catalogue change cannot
     *                             move an existing reservation's total
     */
    public record PricedAccommodation(
            UUID accommodationTypeId,
            String name,
            int units,
            BigDecimal snapshotUnitPriceTtc,
            BigDecimal tvaRate,
            BigDecimal lineTotalTtc,
            BigDecimal lineTotalHt,
            BigDecimal lineTotalTva
    ) {}

    /**
     * @param date the stay's check-in date — every nuitée today is exactly one
     *             night (see PublicBookingServiceImpl), so a single date is
     *             enough to resolve which price applies; there is no
     *             per-night iteration to do.
     */
    @Transactional(readOnly = true)
    public PricedAccommodation resolveBySlug(UUID tourTypeId, String slug, int units, int nights, int partySize, LocalDate date) {
        AccommodationType acc = repository.findByTourTypeAndSlug(tourTypeId, slug)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Accommodation not found for this stay: " + slug));
        return resolve(acc, units, nights, partySize, date);
    }

    @Transactional(readOnly = true)
    public PricedAccommodation resolveById(UUID accommodationTypeId, int units, int nights, int partySize, LocalDate date) {
        AccommodationType acc = repository.findById(accommodationTypeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Accommodation not found: " + accommodationTypeId));
        return resolve(acc, units, nights, partySize, date);
    }

    private PricedAccommodation resolve(AccommodationType acc, int units, int nights, int partySize, LocalDate date) {
        if (!acc.isActive()) {
            throw new AccommodationPricingException(
                    "\"" + acc.getName() + "\" is no longer available.");
        }
        if (acc.getUnitPriceTtc() == null) {
            throw new AccommodationPricingException(
                    "\"" + acc.getName() + "\" can't be booked online yet — please contact the camp to reserve it.");
        }
        if (units < 1) {
            throw new AccommodationPricingException("Choose at least one " + acc.getName() + ".");
        }
        int nightsSafe = Math.max(nights, 1);
        if ((long) units * acc.getCapacity() < partySize) {
            throw new AccommodationPricingException(
                    units + " × \"" + acc.getName() + "\" sleeps " + (units * acc.getCapacity())
                            + " — not enough for a party of " + partySize + ".");
        }

        BigDecimal unit = Money.round(resolveUnitPrice(acc, date));
        BigDecimal rate = acc.getTvaRate();
        BigDecimal ttc = Money.lineTotal(unit, units, nightsSafe);
        return new PricedAccommodation(
                acc.getId(), acc.getName(), units, unit, rate,
                ttc, Money.htFromTtc(ttc, rate), Money.taxFromTtc(ttc, rate));
    }

    /**
     * DATE rule beats PERIOD rule beats the tier's standard price — the
     * priority order from the pricing brief. Season isn't a rule type yet
     * (see PricingRuleType); when it is, it slots in here between PERIOD
     * and standard.
     */
    private BigDecimal resolveUnitPrice(AccommodationType acc, LocalDate date) {
        if (date == null) return acc.getUnitPriceTtc();
        List<PricingRule> covering = pricingRuleRepository.findActiveCovering(acc.getId(), date);
        return covering.stream()
                .filter(r -> r.getRuleType() == PricingRuleType.DATE)
                .findFirst()
                .or(() -> covering.stream().filter(r -> r.getRuleType() == PricingRuleType.PERIOD).findFirst())
                .map(PricingRule::getPriceTtc)
                .orElse(acc.getUnitPriceTtc());
    }
}
