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

    @Transactional(readOnly = true)
    public ReservationOverview forReservation(UUID reservationId) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));
        return build(r, paymentService.computePaymentSummary(r));
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
