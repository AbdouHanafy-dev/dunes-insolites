package com.camping.duneinsolite.mail;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Everything a client needs to see about a booking in one glance, shown in the
 * confirmation, payment-request and payment-received emails. Built by the
 * caller from the reservation (see {@code ReservationOverviewFactory}); a mail
 * sent without one simply omits the block.
 *
 * @param mainAmount the accommodation / circuit part of the total, before extras
 * @param paid       what has been recorded as paid so far
 * @param balance    what is still to pay
 */
public record ReservationOverview(
        String reference, LocalDate arrival, LocalDate departure,
        int adults, int children, int infants,
        List<Item> items, BigDecimal mainAmount, List<Extra> extras,
        BigDecimal total, BigDecimal paid, BigDecimal balance, String currency) {

    /** A stay, circuit or accommodation on the booking. {@code detail} may be blank. */
    public record Item(String name, String detail) {}

    /** An activity or extra with its price. */
    public record Extra(String name, String detail, BigDecimal amount) {}
}
