-- Remembers, per language, whether a translation was written by the machine and not yet read by a
-- person (review_status AUTO) or has been checked (REVIEWED), and a fingerprint of the French text it
-- was made from (source_hash) so the back office can warn when the French has changed since.
--
-- Additive only: two new nullable columns on each translation table, nothing existing is altered,
-- moved or deleted. Rows already saved keep NULL = "written by hand / before this existed", which the
-- back office treats as neither flagged nor stale. IF NOT EXISTS keeps a re-run harmless.
ALTER TABLE tour_translations
    ADD COLUMN IF NOT EXISTS review_status varchar(20),
    ADD COLUMN IF NOT EXISTS source_hash varchar(64);

ALTER TABLE tour_type_translations
    ADD COLUMN IF NOT EXISTS review_status varchar(20),
    ADD COLUMN IF NOT EXISTS source_hash varchar(64);

ALTER TABLE extra_translations
    ADD COLUMN IF NOT EXISTS review_status varchar(20),
    ADD COLUMN IF NOT EXISTS source_hash varchar(64);

ALTER TABLE accommodation_type_translations
    ADD COLUMN IF NOT EXISTS review_status varchar(20),
    ADD COLUMN IF NOT EXISTS source_hash varchar(64);
