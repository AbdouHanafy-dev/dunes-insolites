-- V11__site_settings.sql
-- On request, 15 Sep 2026: business-fact fields the vitrine currently
-- hardcodes in frontend/lib/site.ts (phone/email/whatsapp/address/coords/
-- social links) and frontend/lib/data/stats.ts (guestsGuided/yearsRunning
-- — explicitly "pending confirmation from the business owner", never
-- computed) become admin-editable instead of requiring a code deploy
-- every time a real phone number or the current guest count changes.
-- Single row, same "id always 1" shape as camping_settings.
CREATE TABLE site_settings (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(64) NOT NULL,
    whatsapp character varying(64) NOT NULL,
    address character varying(255) NOT NULL,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,
    instagram_url character varying(255),
    facebook_url character varying(255),
    tiktok_url character varying(255),
    -- Presentational strings ("12k+", "8 yrs"), not numbers — same reason
    -- packages/api-types's Stats type documents: formatted at the source,
    -- never computed from a count this app doesn't actually track.
    guests_guided character varying(32) NOT NULL,
    years_running character varying(32) NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT site_settings_pkey PRIMARY KEY (id)
);

-- Seeded with today's real, live values (frontend/lib/site.ts's
-- DUNES_INSOLITES config and lib/data/stats.ts's seed) so nothing changes
-- visually until an admin actually edits something here.
INSERT INTO site_settings (
    id, email, phone, whatsapp, address, latitude, longitude,
    instagram_url, facebook_url, tiktok_url, guests_guided, years_running, updated_at
) VALUES (
    1, 'hello@dunes-insolites.tn', '+216 27 391 501', '+216 27 391 501',
    'Sabria, Kebili Governorate, Tunisia', 33.2286, 9.0056,
    'https://www.instagram.com/dunes_insolites/', 'https://www.facebook.com/campementdunes',
    'https://www.tiktok.com/@dunes_insolites', '12k+', '8 yrs', now()
);
