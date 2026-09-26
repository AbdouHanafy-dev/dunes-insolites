-- Promo codes given to partner hotels for circuits (e.g. BADIRA10: 10 % off). The discount applies to
-- the circuit price only; the hotel earns a commission on the circuits its code brought in.
CREATE TABLE promo_codes (
    promo_code_id      UUID PRIMARY KEY,
    code               VARCHAR(40)   NOT NULL,
    partner_name       VARCHAR(120)  NOT NULL,
    discount_percent   NUMERIC(5, 2) NOT NULL,
    commission_percent NUMERIC(5, 2),
    valid_from         DATE,
    valid_until        DATE,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT promo_codes_discount_range CHECK (discount_percent > 0 AND discount_percent <= 100),
    CONSTRAINT promo_codes_commission_range CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100))
);
CREATE UNIQUE INDEX uk_promo_codes_code ON promo_codes (upper(code));

-- What a reservation was granted, frozen at booking time: editing a code later never changes past bookings.
ALTER TABLE reservations ADD COLUMN promo_discount_percent NUMERIC(5, 2);
ALTER TABLE reservations ADD COLUMN promo_commission_percent NUMERIC(5, 2);
CREATE INDEX idx_reservations_promo_code ON reservations (upper(promo_code)) WHERE promo_code IS NOT NULL;

-- The first two partner hotels. The commission rate is left empty until the owner sets it.
INSERT INTO promo_codes (promo_code_id, code, partner_name, discount_percent)
VALUES (gen_random_uuid(), 'BADIRA10', 'Hôtel Badira', 10),
       (gen_random_uuid(), 'MOURADI2026', 'Hôtel Mouradi', 15)
ON CONFLICT DO NOTHING;
