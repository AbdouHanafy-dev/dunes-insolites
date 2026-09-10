-- V5__money_to_numeric.sql
-- Production-hardening Phase 3: every monetary / rate column moves from
-- `double precision` to `numeric` so authoritative money arithmetic is exact.
--
-- Conversion: `USING col::numeric(P,S)`. PostgreSQL converts double → numeric
-- exactly; values with more binary noise than the target scale (e.g. a float
-- 0.30000000000000004) round to the millime — which is the value that was
-- always intended. Existing 95 → 95.000, 4.9 → 4.900. No value's business
-- meaning changes. Historical invoice rows are NOT recalculated — only the
-- storage type changes.
--
-- NOT converted: *.average_rating (a review rating, not money) stays double.
--
-- See docs/reports/phase3-money.md.

-- ── MONEY  → numeric(15,3) ─────────────────────────────────────────────
ALTER TABLE tour_types
    ALTER COLUMN passenger_adult_price TYPE numeric(15,3) USING passenger_adult_price::numeric(15,3),
    ALTER COLUMN passenger_child_price TYPE numeric(15,3) USING passenger_child_price::numeric(15,3),
    ALTER COLUMN partner_adult_price   TYPE numeric(15,3) USING partner_adult_price::numeric(15,3),
    ALTER COLUMN partner_child_price   TYPE numeric(15,3) USING partner_child_price::numeric(15,3);

ALTER TABLE tours
    ALTER COLUMN passenger_adult_price TYPE numeric(15,3) USING passenger_adult_price::numeric(15,3),
    ALTER COLUMN passenger_child_price TYPE numeric(15,3) USING passenger_child_price::numeric(15,3),
    ALTER COLUMN partner_adult_price   TYPE numeric(15,3) USING partner_adult_price::numeric(15,3),
    ALTER COLUMN partner_child_price   TYPE numeric(15,3) USING partner_child_price::numeric(15,3);

ALTER TABLE extras
    ALTER COLUMN unit_price TYPE numeric(15,3) USING unit_price::numeric(15,3);

ALTER TABLE reservation_tour_types
    ALTER COLUMN adult_price TYPE numeric(15,3) USING adult_price::numeric(15,3),
    ALTER COLUMN child_price TYPE numeric(15,3) USING child_price::numeric(15,3);

ALTER TABLE reservation_tours
    ALTER COLUMN adult_price TYPE numeric(15,3) USING adult_price::numeric(15,3),
    ALTER COLUMN child_price TYPE numeric(15,3) USING child_price::numeric(15,3),
    ALTER COLUMN total_price TYPE numeric(15,3) USING total_price::numeric(15,3);

ALTER TABLE reservation_extras
    ALTER COLUMN unit_price  TYPE numeric(15,3) USING unit_price::numeric(15,3),
    ALTER COLUMN total_price TYPE numeric(15,3) USING total_price::numeric(15,3);

ALTER TABLE reservations
    ALTER COLUMN total_amount        TYPE numeric(15,3) USING total_amount::numeric(15,3),
    ALTER COLUMN total_extras_amount TYPE numeric(15,3) USING total_extras_amount::numeric(15,3),
    ALTER COLUMN exchange_rate_applied TYPE numeric(12,6) USING exchange_rate_applied::numeric(12,6);

ALTER TABLE invoices
    ALTER COLUMN total_amount   TYPE numeric(15,3) USING total_amount::numeric(15,3),
    ALTER COLUMN paid_amount    TYPE numeric(15,3) USING paid_amount::numeric(15,3),
    ALTER COLUMN total_ht       TYPE numeric(15,3) USING total_ht::numeric(15,3),
    ALTER COLUMN tva_amount     TYPE numeric(15,3) USING tva_amount::numeric(15,3),
    ALTER COLUMN timbre_fiscal  TYPE numeric(15,3) USING timbre_fiscal::numeric(15,3),
    ALTER COLUMN total_ttc      TYPE numeric(15,3) USING total_ttc::numeric(15,3);

ALTER TABLE invoice_items
    ALTER COLUMN unit_price TYPE numeric(15,3) USING unit_price::numeric(15,3);

ALTER TABLE transactions
    ALTER COLUMN amount TYPE numeric(15,3) USING amount::numeric(15,3);

ALTER TABLE user_product_remises
    ALTER COLUMN adult_remise TYPE numeric(15,3) USING adult_remise::numeric(15,3),
    ALTER COLUMN child_remise TYPE numeric(15,3) USING child_remise::numeric(15,3),
    ALTER COLUMN unit_remise  TYPE numeric(15,3) USING unit_remise::numeric(15,3);

-- ── RATE (percentage)  → numeric(6,3) ─────────────────────────────────
ALTER TABLE tour_types            ALTER COLUMN tva TYPE numeric(6,3) USING tva::numeric(6,3);
ALTER TABLE tours                 ALTER COLUMN tva TYPE numeric(6,3) USING tva::numeric(6,3);
ALTER TABLE extras                ALTER COLUMN tva TYPE numeric(6,3) USING tva::numeric(6,3);
ALTER TABLE reservation_tour_types ALTER COLUMN tva TYPE numeric(6,3) USING tva::numeric(6,3);
ALTER TABLE reservation_tours     ALTER COLUMN tva TYPE numeric(6,3) USING tva::numeric(6,3);
ALTER TABLE reservation_extras    ALTER COLUMN tva TYPE numeric(6,3) USING tva::numeric(6,3);
ALTER TABLE invoice_items         ALTER COLUMN tva TYPE numeric(6,3) USING tva::numeric(6,3);
ALTER TABLE invoices              ALTER COLUMN tva_rate TYPE numeric(6,3) USING tva_rate::numeric(6,3);
