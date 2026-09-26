-- The currency the guest was looking at on the site when they booked (EUR, USD or TND).
-- Display only: the booking, its payments and its invoices stay in the reservation's own currency;
-- the guest's e-mails show amounts converted to this one. NULL = follow the reservation's currency.
ALTER TABLE reservations ADD COLUMN display_currency VARCHAR(3);
