package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.exception.ServiceOptionPricingException;
import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.model.ServiceOptionPricingRule;
import com.camping.duneinsolite.model.enums.PricingRuleType;
import com.camping.duneinsolite.model.enums.PricingUnit;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.ServiceOptionPricingRuleRepository;
import com.camping.duneinsolite.repository.ServiceOptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * The one authority on what a guide/transport option costs - the twin of
 * {@link AccommodationPricingService}. The client sends only an option and
 * a quantity (days/persons/vehicles, depending on the option's
 * {@code pricingUnit}); every price comes from here.
 *
 * <p>Fails closed: an unpriced or inactive option throws - no booking is
 * created.
 */
@Service
@RequiredArgsConstructor
public class ServiceOptionPricingService {

    private final ServiceOptionRepository repository;
    private final ServiceOptionPricingRuleRepository pricingRuleRepository;

    /**
     * @param snapshotUnitPriceTtc unit price at booking time — persisted, never
     *                             re-read, so a later catalogue change cannot
     *                             move an existing reservation's total
     * @param quantity             the quantity actually priced - always 1 for
     *                             PER_BOOKING regardless of what the caller
     *                             requested (never trust the client for this)
     */
    public record PricedServiceOption(
            UUID serviceOptionId,
            String name,
            String description,
            String category,
            String type,
            PricingUnit pricingUnit,
            int quantity,
            BigDecimal snapshotUnitPriceTtc,
            BigDecimal tvaRate,
            BigDecimal lineTotalTtc,
            boolean requiresPickupLocation,
            boolean requiresCustomerVehicle
    ) {}

    @Transactional(readOnly = true)
    public PricedServiceOption resolveById(UUID serviceOptionId, int requestedQuantity, LocalDate date) {
        ServiceOption option = repository.findById(serviceOptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Service option not found: " + serviceOptionId));
        return resolve(option, requestedQuantity, date);
    }

    private PricedServiceOption resolve(ServiceOption option, int requestedQuantity, LocalDate date) {
        if (!option.isActive()) {
            throw new ServiceOptionPricingException(
                    "\"" + option.getName() + "\" is no longer available.");
        }
        if (option.getUnitPriceTtc() == null) {
            throw new ServiceOptionPricingException(
                    "\"" + option.getName() + "\" can't be booked online yet — please contact the camp to reserve it.");
        }
        // PER_BOOKING is always exactly 1 - the caller's requested quantity is
        // never trusted for this, same discipline as never trusting a
        // client-sent price.
        int quantity = option.getPricingUnit() == PricingUnit.PER_BOOKING ? 1 : Math.max(requestedQuantity, 1);

        BigDecimal unit = Money.round(resolveUnitPrice(option, date));
        BigDecimal rate = option.getTvaRate();
        BigDecimal ttc = Money.lineTotal(unit, quantity, 1);
        return new PricedServiceOption(
                option.getId(), option.getName(), option.getDescription(),
                option.getCategory().name(), option.getType(), option.getPricingUnit(),
                quantity, unit, rate, ttc,
                option.isRequiresPickupLocation(), option.isRequiresCustomerVehicle());
    }

    /** DATE rule beats PERIOD rule beats the option's standard price - same priority as accommodation. */
    private BigDecimal resolveUnitPrice(ServiceOption option, LocalDate date) {
        if (date == null) return option.getUnitPriceTtc();
        List<ServiceOptionPricingRule> covering = pricingRuleRepository.findActiveCovering(option.getId(), date);
        return covering.stream()
                .filter(r -> r.getRuleType() == PricingRuleType.DATE)
                .findFirst()
                .or(() -> covering.stream().filter(r -> r.getRuleType() == PricingRuleType.PERIOD).findFirst())
                .map(ServiceOptionPricingRule::getPriceTtc)
                .orElse(option.getUnitPriceTtc());
    }
}
