-- V9__newsletter_launch_email.sql
-- Newsletter subscribers get an admin list view (previously DB-query-only,
-- see NewsletterSubscriber's own class comment) and a one-click "the site
-- is ready" launch announcement, sent once to everyone who hasn't already
-- gotten it — launch_email_sent_at makes the send button idempotent, same
-- idiom as the reservation idempotency work in V7: pressing it twice must
-- never double-email a real subscriber.
ALTER TABLE newsletter_subscribers ADD COLUMN launch_email_sent_at timestamp(6) without time zone NULL;

-- NEWSLETTER_SUBSCRIBERS joins the delegable-resource permission matrix
-- (AdminResource.NEWSLETTER_SUBSCRIBERS, RolePermissionSeeder seeds it at
-- NONE for CAMPING/PARTENAIRE). The baseline CHECK constraint enumerates
-- the allowed values, so it has to be widened — same as GALLERY in V8.
ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_resource_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_resource_check
    CHECK ((resource)::text = ANY ((ARRAY[
        'USERS','RESERVATIONS','INVOICES','TRANSACTIONS','TOURS','TOUR_TYPES',
        'EXTRAS','REVIEWS','AVAILABILITY','PAGES','CONTENT_BLOCKS','MEDIA',
        'NAVIGATION','REDIRECTS','GALLERY','MAINTENANCE_WINDOWS','NEWSLETTER_SUBSCRIBERS'
    ]::character varying[])::text[]));
