-- The catalogue and every stored amount are euros; the base currency is now
-- EUR (CurrencyConfig.BASE). Rows labelled TND only carried the old default:
-- relabel them, amounts unchanged.
ALTER TABLE reservations ALTER COLUMN currency SET DEFAULT 'EUR';
ALTER TABLE transactions ALTER COLUMN currency SET DEFAULT 'EUR';
ALTER TABLE invoices ALTER COLUMN currency SET DEFAULT 'EUR';
ALTER TABLE accommodation_types ALTER COLUMN currency SET DEFAULT 'EUR';

UPDATE reservations SET currency = 'EUR' WHERE currency = 'TND';
UPDATE transactions SET currency = 'EUR' WHERE currency = 'TND';
UPDATE invoices SET currency = 'EUR' WHERE currency = 'TND';
UPDATE accommodation_types SET currency = 'EUR' WHERE currency = 'TND';

-- exchange_rate_applied changes meaning: it used to be "dinars per unit of the
-- reservation currency", it is now "euros per unit". A EUR reservation needs no
-- rate (1); a USD one is rescaled by the default 3.4 TND per EUR.
UPDATE reservations SET exchange_rate_applied = NULL WHERE currency = 'EUR';
UPDATE reservations SET exchange_rate_applied = ROUND(exchange_rate_applied / 3.4, 10)
WHERE currency = 'USD' AND exchange_rate_applied IS NOT NULL;
