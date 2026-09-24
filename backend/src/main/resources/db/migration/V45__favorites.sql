-- V45__favorites.sql
-- A logged-in customer's saved items ("favoris"): circuits, stays and
-- activities, identified by their public slug. Guests keep theirs in the
-- browser only; the site merges the two when someone logs in. Rows go with
-- the user (ON DELETE CASCADE).
CREATE TABLE favorites (
    favorite_id uuid NOT NULL,
    user_id uuid NOT NULL,
    item_type character varying(20) NOT NULL,
    item_slug character varying(160) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT favorites_pkey PRIMARY KEY (favorite_id),
    CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT favorites_type_check CHECK (item_type IN ('TOUR', 'STAY', 'ACTIVITY')),
    CONSTRAINT uk_favorites_user_item UNIQUE (user_id, item_type, item_slug)
);

CREATE INDEX ix_favorites_user_created ON favorites (user_id, created_at DESC);
