package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.config.CurrencyConfig;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.*;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.DocumentSequenceRepository;
import com.camping.duneinsolite.repository.InvoiceRepository;
import com.camping.duneinsolite.service.PaymentService;
import com.camping.duneinsolite.service.ReservationInvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * See {@link ReservationInvoiceService}. Every method body below is the code
 * that previously lived inline in {@code ReservationServiceImpl} —
 * {@code onConfirmed} (proforma), {@code onCompleted} / {@code generateFactureLater}
 * (facture), {@code populateInvoiceItems}, {@code generate*Number},
 * {@code getTimbreFiscal} — moved verbatim, with the two number generators and
 * the three payment-status ladders collapsed to one helper each. No behavioural
 * change; {@code ReservationInvoiceIT} is the characterization net.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ReservationInvoiceServiceImpl implements ReservationInvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final DocumentSequenceRepository documentSequenceRepository;
    private final PaymentService paymentService;
    private final CurrencyConfig currencyConfig;

    @Override
    public Invoice generateProforma(Reservation reservation, CompanyType companyType) {
        BigDecimal proformaTotal = Money.add(
                reservation.getTotalAmount(), reservation.getTotalExtrasAmount());

        BigDecimal paidSoFar = Money.nz(paymentService.computePaymentSummary(reservation).getTotalPaid());

        Invoice proforma = Invoice.builder()
                .invoiceNumber(nextNumber("PROFORMA"))
                .invoiceType(InvoiceType.PROFORMA)
                .invoiceDate(LocalDate.now())
                .paidAmount(paidSoFar)
                .status(InvoiceStatus.DRAFT)
                .paymentStatus(paymentStatusFor(paidSoFar, proformaTotal))
                .currency(reservation.getCurrency())
                .reservation(reservation)
                .user(reservation.getUser())
                .companyType(companyType)
                .build();

        BigDecimal[] tvaBreakdown = populateInvoiceItems(reservation, proforma);
        BigDecimal totalHt  = tvaBreakdown[0];
        BigDecimal totalTva = tvaBreakdown[1];
        BigDecimal totalTtc = Money.add(totalHt, totalTva);

        proforma.setTotalHt(totalHt);
        proforma.setTvaRate(Money.ZERO);
        proforma.setTvaAmount(totalTva);
        proforma.setTotalTtc(totalTtc);
        proforma.setTotalAmount(totalTtc);

        return invoiceRepository.save(proforma);
    }

    @Override
    public Invoice generateFacture(Reservation reservation, CompanyType companyType) {
        BigDecimal rawTotal = Money.add(
                reservation.getTotalAmount(), reservation.getTotalExtrasAmount());

        Currency currency = reservation.getCurrency() != null ? reservation.getCurrency() : CurrencyConfig.BASE;
        BigDecimal timbreFiscal = getTimbreFiscal(reservation);
        LocalDate invoiceDate = reservation.getCompletedAt() != null
                ? reservation.getCompletedAt().toLocalDate() : LocalDate.now();

        Invoice facture = Invoice.builder()
                .invoiceNumber(nextNumber("FACTURE"))
                .invoiceType(InvoiceType.STANDARD)
                .invoiceDate(invoiceDate)
                .totalAmount(rawTotal)
                .timbreFiscal(timbreFiscal)
                .status(InvoiceStatus.DRAFT)
                .currency(currency)
                .reservation(reservation)
                .user(reservation.getUser())
                .companyType(companyType)
                .build();

        BigDecimal[] tvaBreakdown = populateInvoiceItems(reservation, facture);
        BigDecimal totalHt  = tvaBreakdown[0];
        BigDecimal totalTva = tvaBreakdown[1];
        BigDecimal totalTtc = Money.add(totalHt, totalTva, timbreFiscal);
        facture.setTotalHt(totalHt);
        facture.setTvaRate(Money.ZERO);
        facture.setTvaAmount(totalTva);
        facture.setTotalTtc(totalTtc);

        BigDecimal paidSoFar = Money.nz(paymentService.computePaymentSummary(reservation).getTotalPaid());
        facture.setPaymentStatus(paymentStatusFor(paidSoFar, totalTtc));
        facture.setPaidAmount(paidSoFar);

        return invoiceRepository.save(facture);
    }

    // UNPAID / PARTIALLY_PAID / PAID — the exact ladder the three inline copies used.
    private static PaymentStatus paymentStatusFor(BigDecimal paidSoFar, BigDecimal total) {
        if (paidSoFar.signum() <= 0)   return PaymentStatus.UNPAID;
        if (Money.lt(paidSoFar, total)) return PaymentStatus.PARTIALLY_PAID;
        return PaymentStatus.PAID;
    }

    /** @return {sumHt, sumTva} — all BigDecimal, all rounded to the millime. */
    private BigDecimal[] populateInvoiceItems(Reservation reservation, Invoice invoice) {
        BigDecimal sumHt = Money.ZERO, sumTva = Money.ZERO;
        int line = 1;

        if (reservation.getReservationType() == ReservationType.HEBERGEMENT
                && reservation.getTourTypes() != null
                && !reservation.getTourTypes().isEmpty()) {

            // Group nights into one invoice line only when they're truly the same stay:
            // same tour, same headcount, same price, same set of accommodation tiers.
            record TourTypeGroupKey(UUID catalogTourTypeId, Integer adults, Integer children,
                                     String adultPrice, String childPrice,
                                     List<String> accommodationKey) {}

            Map<TourTypeGroupKey, List<ReservationTourType>> grouped = new LinkedHashMap<>();
            for (ReservationTourType tt : reservation.getTourTypes()) {
                UUID catalogId = tt.getCatalogTourTypeId() != null
                        ? tt.getCatalogTourTypeId()
                        : tt.getReservationTourTypeId();
                List<String> accommodationKey = tt.getAccommodations().stream()
                        .map(a -> a.getAccommodationTypeId() + ":" + a.getAccommodationUnits()
                                + ":" + plain(a.getAccommodationUnitPriceTtc()))
                        .sorted()
                        .toList();
                TourTypeGroupKey key = new TourTypeGroupKey(
                        catalogId, tt.getNumberOfAdults(), tt.getNumberOfChildren(),
                        plain(tt.getAdultPrice()), plain(tt.getChildPrice()),
                        accommodationKey);
                grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(tt);
            }

            for (List<ReservationTourType> group : grouped.values()) {
                ReservationTourType first = group.get(0);
                int nights      = group.size();
                BigDecimal rate = Money.nz(first.getTva());
                int adults      = first.getNumberOfAdults()   != null ? first.getNumberOfAdults()   : 0;
                int children    = first.getNumberOfChildren() != null ? first.getNumberOfChildren() : 0;
                BigDecimal ap = Money.nz(first.getAdultPrice());
                BigDecimal cp = Money.nz(first.getChildPrice());

                LocalDate minDate = group.stream().map(ReservationTourType::getActivityDate)
                        .filter(d -> d != null).min(Comparator.naturalOrder()).orElse(null);
                LocalDate maxDate = group.stream().map(ReservationTourType::getActivityDate)
                        .filter(d -> d != null).max(Comparator.naturalOrder()).orElse(null);
                LocalDate endDate = (maxDate != null && nights > 1) ? maxDate.plusDays(1) : null;

                // Phase 1: an accommodation-priced line invoices per unit, per
                // tier — a night with several tiers selected (e.g. 2 Suites +
                // 3 Tentes) gets one invoice item per tier.
                if (first.isAccommodationPriced()) {
                    for (ReservationAccommodation acc : first.getAccommodations()) {
                        int units = acc.getAccommodationUnits();
                        BigDecimal accRate = Money.nz(acc.getAccommodationTvaRate());
                        BigDecimal lineTtc = Money.lineTotal(acc.getAccommodationUnitPriceTtc(), units, nights);
                        sumHt  = Money.add(sumHt, Money.htFromTtc(lineTtc, accRate));
                        sumTva = Money.add(sumTva, Money.taxFromTtc(lineTtc, accRate));
                        invoice.addItem(InvoiceItem.builder()
                                .description(acc.getAccommodationName() + (nights > 1 ? " (" + nights + " nuits)" : ""))
                                .itemType("HEBERGEMENT").quantity(units)
                                .unitPrice(Money.htFromTtc(
                                        Money.lineTotal(acc.getAccommodationUnitPriceTtc(), 1, nights), accRate))
                                .tva(accRate).activityDate(minDate).activityEndDate(endDate).lineNumber(line++).build());
                    }
                    continue;
                }

                if (adults > 0) {
                    BigDecimal lineTtc = Money.lineTotal(ap, adults, nights);
                    BigDecimal lineHt  = Money.htFromTtc(lineTtc, rate);
                    sumHt  = Money.add(sumHt, lineHt);
                    sumTva = Money.add(sumTva, Money.subtract(lineTtc, lineHt));
                    invoice.addItem(InvoiceItem.builder()
                            .description(first.getName() + " (Adulte)").itemType("HEBERGEMENT").quantity(adults)
                            .unitPrice(Money.htFromTtc(Money.multiply(ap, nights), rate))
                            .tva(rate).activityDate(minDate).activityEndDate(endDate).lineNumber(line++).build());
                }
                if (children > 0) {
                    BigDecimal lineTtc = Money.lineTotal(cp, children, nights);
                    BigDecimal lineHt  = Money.htFromTtc(lineTtc, rate);
                    sumHt  = Money.add(sumHt, lineHt);
                    sumTva = Money.add(sumTva, Money.subtract(lineTtc, lineHt));
                    invoice.addItem(InvoiceItem.builder()
                            .description(first.getName() + " (Enfant)").itemType("HEBERGEMENT").quantity(children)
                            .unitPrice(Money.htFromTtc(Money.multiply(cp, nights), rate))
                            .tva(rate).activityDate(minDate).activityEndDate(endDate).lineNumber(line++).build());
                }
            }
        } else if (reservation.getReservationType() == ReservationType.TOURS
                && reservation.getTours() != null
                && !reservation.getTours().isEmpty()) {
            for (ReservationTour t : reservation.getTours()) {
                BigDecimal rate = Money.nz(t.getTva());
                int adults   = t.getNumberOfAdults()   != null ? t.getNumberOfAdults()   : 0;
                int children = t.getNumberOfChildren() != null ? t.getNumberOfChildren() : 0;
                BigDecimal ap = Money.nz(t.getAdultPrice());
                BigDecimal cp = Money.nz(t.getChildPrice());

                if (adults > 0) {
                    BigDecimal lineTtc = Money.multiply(ap, adults);
                    BigDecimal lineHt  = Money.htFromTtc(lineTtc, rate);
                    sumHt  = Money.add(sumHt, lineHt);
                    sumTva = Money.add(sumTva, Money.subtract(lineTtc, lineHt));
                    invoice.addItem(InvoiceItem.builder()
                            .description(t.getName() + " (Adulte)").itemType("TOURS").quantity(adults)
                            .unitPrice(Money.htFromTtc(ap, rate)).tva(rate)
                            .activityDate(t.getDepartureDate()).lineNumber(line++).build());
                }
                if (children > 0) {
                    BigDecimal lineTtc = Money.multiply(cp, children);
                    BigDecimal lineHt  = Money.htFromTtc(lineTtc, rate);
                    sumHt  = Money.add(sumHt, lineHt);
                    sumTva = Money.add(sumTva, Money.subtract(lineTtc, lineHt));
                    invoice.addItem(InvoiceItem.builder()
                            .description(t.getName() + " (Enfant)").itemType("TOURS").quantity(children)
                            .unitPrice(Money.htFromTtc(cp, rate)).tva(rate)
                            .activityDate(t.getDepartureDate()).lineNumber(line++).build());
                }

                // A circuit that overnights at the camp — one invoice item
                // per accommodation tier, per night, same as the Stay side.
                for (ReservationTourHebergement heb : t.getHebergements()) {
                    int nights = heb.getNumberOfNights() != null && heb.getNumberOfNights() > 0
                            ? heb.getNumberOfNights() : 1;
                    for (ReservationAccommodation acc : heb.getAccommodations()) {
                        int units = acc.getAccommodationUnits();
                        BigDecimal accRate = Money.nz(acc.getAccommodationTvaRate());
                        BigDecimal lineTtc = Money.lineTotal(acc.getAccommodationUnitPriceTtc(), units, nights);
                        sumHt  = Money.add(sumHt, Money.htFromTtc(lineTtc, accRate));
                        sumTva = Money.add(sumTva, Money.taxFromTtc(lineTtc, accRate));
                        invoice.addItem(InvoiceItem.builder()
                                .description(acc.getAccommodationName() + (nights > 1 ? " (" + nights + " nuits)" : ""))
                                .itemType("HEBERGEMENT").quantity(units)
                                .unitPrice(Money.htFromTtc(
                                        Money.lineTotal(acc.getAccommodationUnitPriceTtc(), 1, nights), accRate))
                                .tva(accRate).activityDate(heb.getActivityDate()).lineNumber(line++).build());
                    }
                }
            }
        }

        if (reservation.getExtras() != null) {
            for (ReservationExtra extra : reservation.getExtras()) {
                if (Boolean.TRUE.equals(extra.getIsActive())) {
                    BigDecimal rate = Money.nz(extra.getTva());
                    int qty = extra.getQuantity() != null ? extra.getQuantity() : 1;
                    BigDecimal unitP = Money.nz(extra.getUnitPrice());
                    BigDecimal lineTtc = extra.getTotalPrice() != null
                            ? Money.round(extra.getTotalPrice()) : Money.multiply(unitP, qty);
                    BigDecimal lineHt = Money.htFromTtc(lineTtc, rate);
                    sumHt  = Money.add(sumHt, lineHt);
                    sumTva = Money.add(sumTva, Money.subtract(lineTtc, lineHt));
                    invoice.addItem(InvoiceItem.builder()
                            .description(extra.getName()).itemType("EXTRA").quantity(qty)
                            .unitPrice(Money.htFromTtc(unitP, rate)).tva(rate)
                            .activityDate(extra.getActivityDate()).lineNumber(line++).build());
                }
            }
        }

        return new BigDecimal[]{ Money.round(sumHt), Money.round(sumTva) };
    }

    private static String plain(BigDecimal b) {
        return b == null ? null : Money.round(b).toPlainString();
    }

    // The per-year, per-type document counter — pessimistic-locked so two
    // concurrent confirmations can never mint the same number.
    private String nextNumber(String type) {
        int year = LocalDate.now().getYear();
        DocumentSequence seq = documentSequenceRepository
                .findByTypeAndYearForUpdate(type, year)
                .orElseGet(() -> DocumentSequence.builder()
                        .type(type).year(year).lastNumber(0).build());
        seq.setLastNumber(seq.getLastNumber() + 1);
        documentSequenceRepository.save(seq);
        return String.format("%03d/%d", seq.getLastNumber(), year);
    }

    /** Tunisian stamp duty: 1.000 TND, expressed in the reservation's currency. */
    private BigDecimal getTimbreFiscal(Reservation reservation) {
        // 1 TND in base units, then into the reservation's own currency.
        return Money.divide(currencyConfig.rateFor(Currency.TND), currencyConfig.effectiveRate(reservation));
    }
}
