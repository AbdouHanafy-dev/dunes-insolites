-- V44__site_images.sql
-- Editable "slots" for the photos that used to be fixed in the frontend code
-- (home hero, page headers, the Qui sommes-nous page, activity fallbacks...).
-- One row per slot that support has overridden; no row = the site keeps its
-- built-in photo. Served unauthenticated via GET /api/public/site-images and
-- managed under /api/site-images (AdminResource.MEDIA in the permission matrix).
CREATE TABLE site_images (
    image_key character varying(80) NOT NULL,
    image_url character varying(512) NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT site_images_pkey PRIMARY KEY (image_key)
);
