package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.response.PaymentSummary;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mail.ReservationOverview;
import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.ReservationAccommodation;
import com.camping.duneinsolite.model.ReservationExtra;
import com.camping.duneinsolite.model.ReservationTour;
import com.camping.duneinsolite.model.ReservationTourType;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.ReservationRepository;
import com.camping.duneinsolite.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Builds the "your booking at a glance" block of the reservation emails from
 * the real reservation and its payment summary - the same numbers staff see,
 * never anything a client sent. Read-only; it opens its own transaction
 * because the email consumer runs on a RabbitMQ thread with no session, and
 * the booking's lines are lazy collections.
 */
@Service
@RequiredArgsConstructor
public class ReservationOverviewFactory {

    private final ReservationRepository reservationRepository;
    private final PaymentService paymentService;
    private final CustomerCurrency customerCurrency;

    @Transactional(readOnly = true)
    public ReservationOverview forReservation(UUID reservationId) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));
        return inGuestCurrency(build(r, paymentService.computePaymentSummary(r)), r);
    }

    /** The overview with every amount shown in the currency the guest booked in. */
    private ReservationOverview inGuestCurrency(ReservationOverview o, Reservation r) {
        var to = customerCurrency.of(r);
        var from = r.getCurrency();
        if (from == to) return o;
        java.util.function.UnaryOperator<java.math.BigDecimal> c = amount -> customerCurrency.convert(amount, from, to);
        return new ReservationOverview(
                o.reference(), o.arrival(), o.departure(), o.adults(), o.children(), o.infants(),
                o.items(), c.apply(o.mainAmount()),
                o.extras().stream().map(e -> new ReservationOverview.Extra(e.name(), e.detail(), c.apply(e.amount()))).toList(),
                c.apply(o.total()), c.apply(o.paid()), c.apply(o.balance()), to.name());
    }

    /** What the team email needs beyond the overview: where it came from and who booked. */
    public record StaffFacts(String sourceName, String customerName, String customerEmail, String customerPhone,
                             String locale, ReservationOverview overview) {}

    @Transactional(readOnly = true)
    public StaffFacts staffFacts(UUID reservationId) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));
        var user = r.getUser();
        return new StaffFacts(
                r.getSourceRef() == null ? null : r.getSourceRef().getName(),
                user == null ? null : user.getName(), user == null ? null : user.getEmail(),
                user == null ? null : user.getPhone(), r.getLocale(),
                build(r, paymentService.computePaymentSummary(r)));
    }

    static ReservationOverview build(Reservation r, PaymentSummary summary) {
        List<ReservationOverview.Item> items = new ArrayList<>();
        for (ReservationTourType tt : r.getTourTypes()) {
            List<String> parts = new ArrayList<>();
            for (ReservationAccommodation a : tt.getAccommodations()) {
                if (a.getAccommodationName() != null && !a.getAccommodationName().isBlank()) {
                    int units = a.getAccommodationUnits() == null ? 1 : a.getAccommodationUnits();
                    parts.add(units > 1 ? units + " × " + a.getAccommodationName() : a.getAccommodationName());
                }
            }
            items.add(new ReservationOverview.Item(tt.getName(), String.join(" · ", parts)));
        }
        for (ReservationTour t : r.getTours()) {
            items.add(new ReservationOverview.Item(t.getName(), ""));
        }

        List<ReservationOverview.Extra> extras = new ArrayList<>();
        for (ReservationExtra e : r.getExtras()) {
            if (Boolean.FALSE.equals(e.getIsActive())) continue;
            String detail = e.getQuantity() != null && e.getQuantity() > 1 ? "× " + e.getQuantity() : "";
            extras.add(new ReservationOverview.Extra(e.getName(), detail, Money.nz(e.getTotalPrice())));
        }

        java.time.LocalDate arrival = r.getCheckInDate() != null ? r.getCheckInDate() : r.getServiceDate();
        java.time.LocalDate departure = r.getCheckInDate() != null ? r.getCheckOutDate() : null;
        String currency = r.getCurrency() != null ? r.getCurrency().name() : "EUR";
        String reference = "DI-" + r.getReservationId().toString().substring(0, 8).toUpperCase();

        return new ReservationOverview(
                reference, arrival, departure,
                nz(r.getNumberOfAdults()), nz(r.getNumberOfChildren()), nz(r.getNumberOfInfants()),
                items, Money.nz(summary.getOriginalMainAmount()), extras,
                Money.nz(summary.getOriginalTotalAmount()), Money.nz(summary.getTotalPaid()),
                Money.nz(summary.getRemainingTotal()), currency);
    }

    private static int nz(Integer n) {
        return n == null ? 0 : n;
    }
}
