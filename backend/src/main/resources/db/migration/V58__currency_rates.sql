-- The exchange rates the owner sets in the back office, written as an equivalence:
-- "10 EUR = 13.6 USD = 34 TND". One row (id 1). The defaults reproduce the previous
-- built-in values (3.4 TND per EUR, 2.5 TND per USD), so nothing changes until they are edited.
CREATE TABLE currency_rates (
    id          SMALLINT PRIMARY KEY,
    eur_amount  NUMERIC(15, 4) NOT NULL,
    usd_amount  NUMERIC(15, 4) NOT NULL,
    tnd_amount  NUMERIC(15, 4) NOT NULL,
    updated_at  TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT currency_rates_single_row CHECK (id = 1),
    CONSTRAINT currency_rates_positive CHECK (eur_amount > 0 AND usd_amount > 0 AND tnd_amount > 0)
);

INSERT INTO currency_rates (id, eur_amount, usd_amount, tnd_amount) VALUES (1, 10, 13.6, 34);
