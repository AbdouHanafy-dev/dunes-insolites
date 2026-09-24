-- V42__external_reviews.sql
-- Real guest reviews from outside this app (Google, TripAdvisor, ...),
-- entered by hand from the guest's own published review. The in-app
-- `reviews` table can't hold these: it is bound to a logged-in user and a
-- product, so a staff member pasting a Google review would be recorded as
-- its author. Text stays in the guest's original language, never
-- translated or rewritten; `owner_reply` is the business's own public
-- answer, when there is one. Shown on the homepage via
-- GET /api/public/reviews. Permission: the existing REVIEWS resource.
CREATE TABLE external_reviews (
    external_review_id uuid NOT NULL,
    author_name character varying(120) NOT NULL,
    country character varying(80),
    rating integer NOT NULL,
    review_date date NOT NULL,
    title character varying(200),
    body text NOT NULL,
    source character varying(30) NOT NULL,
    source_url character varying(512),
    trip_type character varying(120),
    owner_reply text,
    owner_reply_date date,
    published boolean NOT NULL DEFAULT true,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT external_reviews_pkey PRIMARY KEY (external_review_id),
    CONSTRAINT external_reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT external_reviews_source_check CHECK (source IN
        ('GOOGLE','TRIPADVISOR','BOOKING','AIRBNB','GETYOURGUIDE','WETRAVEL'))
);

CREATE INDEX ix_external_reviews_published_date
    ON external_reviews (published, review_date DESC);
