-- V12__google_rating.sql
-- On request, 15 Sep 2026: "the rating from Google, not one you invent" -
-- adds the real Google Place ID + a cache for the real rating/count
-- GooglePlacesService fetches from Google's Places API (never computed or
-- guessed here). Cached with a fetched-at timestamp rather than calling
-- Google on every single page view — see SiteSettingsServiceImpl.
ALTER TABLE site_settings ADD COLUMN google_place_id character varying(255);
ALTER TABLE site_settings ADD COLUMN google_rating numeric(2,1);
ALTER TABLE site_settings ADD COLUMN google_rating_count integer;
ALTER TABLE site_settings ADD COLUMN google_rating_fetched_at timestamp(6) without time zone;

-- The real Place ID for "Camping Dunes insolites", given directly by the
-- business owner (not looked up/guessed). Rating/count stay NULL until
-- the first real fetch succeeds (requires GOOGLE_PLACES_API_KEY to be
-- set) - never seeded with a placeholder number.
UPDATE site_settings SET google_place_id = 'ChIJH4Iv03zxVhIRUS15UxBrLyo' WHERE id = 1;

-- Also corrects the coordinates seeded in V11 - the owner gave the real,
-- more precise values from the Google Business listing itself
-- (33.34028, 8.73217), which differ from the earlier estimate.
UPDATE site_settings SET latitude = 33.34028, longitude = 8.73217 WHERE id = 1;
