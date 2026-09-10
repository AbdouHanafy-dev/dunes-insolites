-- V8__gallery_items.sql
-- The vitrine's photo gallery is now real backoffice content, not the
-- hardcoded list in frontend/lib/data/gallery.ts. Feeds the homepage strip
-- (GalleryStrip) and the /gallery page, served unauthenticated via
-- GET /api/public/gallery; managed under GET/POST/PUT/DELETE /api/gallery
-- (AdminResource.GALLERY in the permission matrix).
--
-- `position` orders the grid; ties fall back to created_at. `tall` is the
-- existing GalleryItem.tall wire flag (a frame that spans two rows in the
-- mosaic). `tag` is the filter facet on the /gallery page — free text so an
-- editor can add a new facet without a deploy.

CREATE TABLE gallery_items (
    gallery_item_id uuid NOT NULL,
    image_url character varying(512) NOT NULL,
    alt character varying(255) NOT NULL,
    tag character varying(120) NOT NULL,
    tall boolean NOT NULL DEFAULT false,
    position integer NOT NULL DEFAULT 0,
    company_type character varying(255) NOT NULL DEFAULT 'DUNES_INSOLITES',
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT gallery_items_pkey PRIMARY KEY (gallery_item_id),
    CONSTRAINT gallery_items_company_type_check
        CHECK ((company_type)::text = ANY ((ARRAY['DUNES_INSOLITES'::character varying, 'ROUTE_INSOLITE'::character varying])::text[]))
);

CREATE INDEX ix_gallery_items_company_position
    ON gallery_items (company_type, position, created_at);

-- GALLERY joins the delegable-resource permission matrix (AdminResource.GALLERY,
-- RolePermissionSeeder seeds it at NONE for CAMPING/PARTENAIRE). The baseline
-- CHECK constraint enumerates the allowed values, so it has to be widened.
ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_resource_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_resource_check
    CHECK ((resource)::text = ANY ((ARRAY[
        'USERS','RESERVATIONS','INVOICES','TRANSACTIONS','TOURS','TOUR_TYPES',
        'EXTRAS','REVIEWS','AVAILABILITY','PAGES','CONTENT_BLOCKS','MEDIA',
        'NAVIGATION','REDIRECTS','GALLERY','MAINTENANCE_WINDOWS'
    ]::character varying[])::text[]));
