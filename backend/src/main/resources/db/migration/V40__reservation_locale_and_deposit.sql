-- V40__reservation_locale_and_deposit.sql
--
-- locale: the language the client was browsing the site in when they booked
-- ("fr", "en", "de", "it", "da", "ar"). Every email about the reservation is
-- written in it. Existing rows are French, the vitrine's default locale.
--
-- deposit_amount: the amount staff asked THIS client for upfront (e.g. 40 of
-- 200, matching a payment link). NULL = follow the payment policy
-- (payment_policy, V39); 0 = explicitly no deposit for this booking.
ALTER TABLE reservations
    ADD COLUMN locale character varying(5) NOT NULL DEFAULT 'fr',
    ADD COLUMN deposit_amount numeric(15,3);
