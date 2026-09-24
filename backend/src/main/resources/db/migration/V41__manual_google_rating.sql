-- V41__manual_google_rating.sql
-- A hand-entered Google rating (as read on the business's Google profile),
-- kept separate from google_rating so the automatic Places fetch never
-- overwrites or is confused with it. The public value is the fetched one
-- when present, otherwise this one; null means "show nothing", never a
-- made-up number.
ALTER TABLE site_settings ADD COLUMN manual_google_rating numeric(2,1);
ALTER TABLE site_settings ADD COLUMN manual_google_rating_count integer;
