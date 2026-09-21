-- Local dev sample data — a data-only snapshot of a freshly seeded
-- database. Auto-restored on backend startup against a genuinely empty
-- local database (see Seed.java's seedFromDump(), gated to app.environment
-- == "local" only — never runs in staging/production). Also restorable by
-- hand via `npm run backend:db:seed-dump` (scripts/restore-dev-dump.mjs),
-- or directly:
--   docker exec -i duneinsolite-postgres psql -U postgres -d duneinsolite \
--     -f /dev/stdin < backend/src/main/resources/seed-data/local-dev-dump.sql
--
-- What's in it, and where each part actually came from:
--   - tour_types (2), extras (6), accommodation_types (3) + all their
--     translations/photos/highlights/included-items sub-tables — the REAL
--     published catalog, created by running the repo's existing
--     scripts/seed-tourtypes.mjs, scripts/seed-extras.mjs and
--     scripts/seed-accommodations.mjs against a running local backend.
--     Those scripts transfer real content straight from
--     frontend/lib/data/*-i18n/*.ts (what the live site actually renders),
--     not anything invented here — see docs/ROADMAP.md's 29 Aug 2026 entry.
--     accommodation_types are deliberately unpriced (unitPriceTtc IS NULL)
--     pending the real F-2 pricing decision — do not invent a price.
--   - tours (3), sources (5), gallery_items (5), navigation_items (6) —
--     Seed.java's existing catalog seed data.
--   - guide_profiles (3), content_blocks (3), newsletter_subscribers (3) —
--     Seed.java additions for this dump, clearly fake/placeholder data
--     (dunes.local emails), never rendered on the public vitrine.
--
-- Regenerate after changing this data with:
--   docker exec duneinsolite-postgres pg_dump -U postgres -d duneinsolite \
--     --data-only --column-inserts --no-owner --no-privileges \
--     --exclude-table=flyway_schema_history --exclude-table=users \
--     --exclude-table=driver_profiles --exclude-table=chauffeurs \
--     --exclude-table=guides --exclude-table=reservations \
--     --exclude-table=reservation_tours --exclude-table=reservation_tour_hebergements \
--     --exclude-table=reservation_tour_types --exclude-table=reservation_extras \
--     --exclude-table=reservation_repartitions --exclude-table=reservation_preferred_languages \
--     --exclude-table=invoices --exclude-table=invoice_items --exclude-table=transactions \
--     --exclude-table=reviews --exclude-table=notifications --exclude-table=account_action_tokens \
--     --exclude-table=email_dispatch --exclude-table=dead_letter_message \
--     --exclude-table=document_sequences --exclude-table=role_permissions \
--     --exclude-table=redirects --exclude-table=maintenance_windows --exclude-table=media_assets \
--     --exclude-table=user_product_remises --exclude-table=custom_roles \
--     --exclude-table=custom_role_permissions --exclude-table=camping_settings \
--     --exclude-table=site_settings --exclude-table=pages --exclude-table=page_blocks \
--     --exclude-table=spoken_languages
--   then strip pg_dump's boilerplate preamble (everything up to and
--   including "SET row_security = off;") and footer ("-- PostgreSQL
--   database dump complete" through the trailing \unrestrict line) — see
--   git history on this file for the exact sed commands used. Do this with
--   plain Unix tools (sed/grep), never PowerShell's Get-Content/
--   WriteAllLines without explicit UTF-8 encoding — confirmed live that it
--   silently mangles accented characters (Français -> FranÃ§ais) and
--   Arabic text into mojibake without erroring.
--
-- Deliberately excludes, and always will:
--   - users / driver_profiles — Keycloak-linked. A static dump's UUIDs
--     would not match whatever Keycloak instance restores it into (auth
--     would silently break — the JWT `sub` claim wouldn't resolve to any
--     local row). Seed.java's driver_profiles section recreates these
--     correctly and automatically on every fresh backend startup instead —
--     this dump is a faster alternative to the rest of Seed.java, not a
--     replacement for the account-creating part of it.
--   - reservations / reservation_* / invoices / invoice_items / transactions
--     — go through ReservationServiceImpl's validation and state machine.
--     A direct data dump bypasses that; don't add these here.
--   - reviews — never fabricate reviews (see CLAUDE.md). Real reviews are
--     entered by hand from what a real guest actually said.
--   - role_permissions, spoken_languages, site_settings, pages, page_blocks
--     — all already fully (re)created by Flyway baseline migrations
--     (RolePermissionSeeder.java, V20, V11, V13 respectively) on every
--     fresh database. Dumping them too caused a real primary-key collision
--     on first restore, confirmed live (spoken_languages_pkey) — excluded
--     here, not just tolerated, since Flyway already owns this data
--     completely and a dump adds nothing.
--   - the one "30 min Quad" extra row that predates this dump
--     (V17__consolidate_services_into_extras.sql's own baseline insert) —
--     not excluded at the table level, since the other 5 real extras in
--     this same table have no migration equivalent. Seed.java's
--     seedFromDump() instead sets continueOnError(true), so this one
--     specific row's harmless duplicate-key failure doesn't abort the
--     other ~530 statements after it.
--
-- ─────────────────────────────────────────────────────────────────────
--
--
-- Data for Name: tour_types; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_types (tour_type_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, group_size_type, is_active, location, meeting_point, name, partner_adult_price, partner_child_price, passenger_adult_price, passenger_child_price, review_count, slug, tva, guide_required) VALUES ('c7434387-2006-404e-9913-0686586e4943', NULL, NULL, NULL, NULL, NULL, 'Decouvrez une experience inoubliable lors de notre excursion d''une nuitee en bivouac dans le desert, au depart du campement Dunes Insolites a Sabria Kebili Tunisie.', '1 Nuitee', NULL, true, NULL, NULL, 'Une Nuitee En Bivouac a Sabria Tunisie', 95.000, 50.000, 95.000, 50.000, 0, 'bivouac-desert-tunisie', 13.000, false);
INSERT INTO public.tour_types (tour_type_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, group_size_type, is_active, location, meeting_point, name, partner_adult_price, partner_child_price, passenger_adult_price, passenger_child_price, review_count, slug, tva, guide_required) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Niché dans le calme du Sahara tunisien, Dunes Insolites est un lieu où l''on ralentit. Arrivez pendant que les dunes s''illuminent, installez-vous dans votre tente, et laissez derrière vous le bruit du quotidien.

Après le dîner, le feu reste allumé bien après la tombée de la nuit. La plupart des hôtes se contentent de s''y asseoir — il n''y a pas de programme pour la soirée au-delà de cela.

Votre tente est préparée avec soin, literie de qualité et lumière douce. Réveillez-vous avec le désert, savourez le petit-déjeuner, et prenez votre temps avant de repartir.', NULL, NULL, NULL, '/images/under-hero.jpg', 'Une nuit complète au campement de Sabria — dîner sous les étoiles, un vrai lit sous une tente en toile, et les dunes juste à la porte.', NULL, NULL, true, 'Sabria', NULL, 'Une nuit à Dunes Insolites', 95.000, 95.000, 95.000, 95.000, 0, 'nuitee-campement-desert', 13.000, false);


--
-- Data for Name: accommodation_types; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accommodation_types (id, tour_type_id, slug, name, description, image_url, capacity, unit_price_ttc, tva_rate, currency, display_order, active, max_units) VALUES ('d82ce109-cf17-4dd4-942f-bec05ea0b2b6', '7359b02c-7db9-4565-9d92-b2d24f75b584', 'desert-tent', 'Tente du désert', 'La nuit classique de Dunes Insolites : une tente privée, une literie soignée, et les dunes juste au-delà de votre porte.', '/images/under-hero.jpg', 2, NULL, NULL, 'TND', 0, true, NULL);
INSERT INTO public.accommodation_types (id, tour_type_id, slug, name, description, image_url, capacity, unit_price_ttc, tva_rate, currency, display_order, active, max_units) VALUES ('a5f21a24-9bf0-40a3-88d0-b7a8ec10d2a6', '7359b02c-7db9-4565-9d92-b2d24f75b584', 'desert-room', 'Chambre du désert', 'Pour les hôtes qui souhaitent l''atmosphère du désert avec un peu plus d''intimité et une nuit plus tranquille au campement fixe.', '/images/gate.jpg', 3, NULL, NULL, 'TND', 1, true, NULL);
INSERT INTO public.accommodation_types (id, tour_type_id, slug, name, description, image_url, capacity, unit_price_ttc, tva_rate, currency, display_order, active, max_units) VALUES ('8b019728-492a-456c-bdac-582a1d6c7883', '7359b02c-7db9-4565-9d92-b2d24f75b584', 'dune-suite', 'Suite des dunes', 'Un séjour désertique généreux pour les couples ou les familles, avec un espace supplémentaire pour se détendre après une soirée sous les étoiles.', '/images/hero-combined.jpg', 4, NULL, NULL, 'TND', 2, true, NULL);


--
-- Data for Name: extras; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.extras (extra_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, duration_end_time, duration_start_time, group_size_type, is_active, location, meeting_point, name, review_count, slug, tva, unit_price, max_units_per_day, category, service_type, pricing_unit, requires_customer_vehicle, display_order) VALUES ('460d3fe9-4be8-48f3-8178-e7e55ada0077', NULL, NULL, NULL, NULL, NULL, 'Session de quad de 30 minutes dans le desert autour du campement.', '30 minute', NULL, NULL, NULL, true, NULL, NULL, '30 min Quad', 0, 'quad-desert', 13.000, 35.000, NULL, 'ACTIVITY', NULL, 'PER_UNIT', false, 0);
INSERT INTO public.extras (extra_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, duration_end_time, duration_start_time, group_size_type, is_active, location, meeting_point, name, review_count, slug, tva, unit_price, max_units_per_day, category, service_type, pricing_unit, requires_customer_vehicle, display_order) VALUES ('05eb1c1e-09aa-4b8b-a630-50a70708ab2b', 'La plus ancienne façon de traverser le sable, et toujours la meilleure. Vous retrouvez votre caravane à la porte de Sabria, grimpez sur votre dromadaire, et laissez l''animal donner le rythme — lent, roulant, sans hâte.

Après quatre-vingt-dix minutes à travers la ceinture de dunes, vous arrivez à un campement bédouin où le thé à la menthe est déjà sur le feu. Vous vous asseyez, vous buvez, vous regardez la lumière devenir cuivrée sur la mer de sable, puis vous repartez sous les premières étoiles.

Aucune expérience n''est nécessaire. Nos chameliers marchent aux côtés de chaque chameau tout au long du parcours, et les enfants à partir de six ans montent avec un parent.', NULL, NULL, NULL, '/images/camel.jpg', 'Une caravane guidée à travers les dunes jusqu''à un campement bédouin pour le thé et le coucher du soleil.', '2h', NULL, NULL, NULL, true, 'Sabria', 'La porte de Sabria, à 10 minutes au sud de Douz', 'Randonnée à dos de chameau', 0, 'camel-trek', 13.000, 45.000, NULL, 'ACTIVITY', NULL, 'PER_UNIT', false, 0);
INSERT INTO public.extras (extra_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, duration_end_time, duration_start_time, group_size_type, is_active, location, meeting_point, name, review_count, slug, tva, unit_price, max_units_per_day, category, service_type, pricing_unit, requires_customer_vehicle, display_order) VALUES ('69e7618c-bd0f-46a4-a1f7-5af6f82fbc48', 'Nous vous conduisons à la plus haute dune praticable de la ceinture de Sabria, nous fartons les planches, et vous apprenez à vous mettre debout en dix minutes environ. Après cela, l''après-midi est à vous.

Les planches sont adaptées pour glisser assis ou debout, donc cela fonctionne que vous ayez déjà fait du snowboard ou jamais rien chaussé du tout. Les moniteurs glissent avec vous et filment les meilleures descentes.

La dune est orientée à l''ouest, ce qui signifie que la dernière heure de la session se déroule face au coucher du soleil.', NULL, NULL, NULL, '/images/sandboard.jpg', 'Dévalez les plus hautes dunes sur une planche fartée — débutants comme confirmés.', '1h15', NULL, NULL, NULL, true, 'Sabria', 'La porte de Sabria, à 10 minutes au sud de Douz', 'Surf des dunes', 0, 'sandboarding-desert', 13.000, 35.000, NULL, 'ACTIVITY', NULL, 'PER_UNIT', false, 0);
INSERT INTO public.extras (extra_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, duration_end_time, duration_start_time, group_size_type, is_active, location, meeting_point, name, review_count, slug, tva, unit_price, max_units_per_day, category, service_type, pricing_unit, requires_customer_vehicle, display_order) VALUES ('d1f94e56-ae3b-4381-a937-6865f531add8', 'Harira, salade tunisienne, brik et viande cuite lentement sur les braises — le même repas que les familles du campement servent à leurs hôtes depuis des années, pris sous une tente bédouine basse éclairée à la lampe et au feu.

Ce moment se déroule en soirée autonome pour les visiteurs à la journée, ou comme dîner inclus dans l''une ou l''autre des nuitées. Dans tous les cas, il se termine de la même façon : thé à la menthe, dattes, et quiconque a apporté son oud ce soir-là.

Des options végétariennes et sans porc sont toujours disponibles — il suffit de le préciser lors de la réservation.', NULL, NULL, NULL, '/images/hero-combined.jpg', 'Un dîner tunisien cuit au feu, servi sous une tente bédouine, suivi de musique autour du feu.', '1h30', NULL, NULL, NULL, true, 'Sabria', 'La porte de Sabria, à 10 minutes au sud de Douz', 'Dîner bédouin', 0, 'bedouin-diner-sahara-tunisien', 13.000, 25.000, NULL, 'ACTIVITY', NULL, 'PER_UNIT', false, 0);
INSERT INTO public.extras (extra_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, duration_end_time, duration_start_time, group_size_type, is_active, location, meeting_point, name, review_count, slug, tva, unit_price, max_units_per_day, category, service_type, pricing_unit, requires_customer_vehicle, display_order) VALUES ('2323372d-f354-4a71-a78e-25b9608b2fe9', 'Sabria est suffisamment éloignée de toute ville pour que le ciel révèle quelque chose que la plupart des hôtes n''ont encore jamais vu : la Voie lactée entière, aucune lueur à l''horizon, aucun besoin d''attendre deux fois que vos yeux s''habituent.

Nous installons des tapis et des coussins à l''écart des lumières du campement, apportons du thé à la menthe et des pâtisseries, et vous montrons ce qui se trouve au-dessus si vous êtes curieux — sinon, c''est simplement le calme.

Organisée chaque nuit claire dans le cadre d''une nuitée, ou en réservation autonome pour les hôtes logeant à proximité.', NULL, NULL, NULL, '/images/under-hero.jpg', 'Une soirée tranquille près du feu sous l''un des ciels les plus sombres de Tunisie, thé et observation des étoiles inclus.', '1h', NULL, NULL, NULL, true, 'Sabria', 'La porte de Sabria, à 10 minutes au sud de Douz', 'Soirées sous les étoiles', 0, 'soirees-sous-les-etoiles', 13.000, 15.000, NULL, 'ACTIVITY', NULL, 'PER_UNIT', false, 0);
INSERT INTO public.extras (extra_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, duration_end_time, duration_start_time, group_size_type, is_active, location, meeting_point, name, review_count, slug, tva, unit_price, max_units_per_day, category, service_type, pricing_unit, requires_customer_vehicle, display_order) VALUES ('8635885b-e0a2-4269-8a7c-3bf0de3fba5d', 'Un lit de braises est d''abord installé, puis du sable par-dessus, puis la pâte est enfouie directement dans la dune elle-même — pas de four, pas de plaque. Vingt minutes plus tard, il en ressort dépoussiéré, craquelé et encore fumant.

Les hôtes sont invités à façonner leur propre pain avant la cuisson. Il revient accompagné d''huile d''olive, de harissa et de dattes — généralement dans le cadre du rituel du coucher du soleil, avant le dîner.

Une démonstration courte et participative plutôt qu''une activité à part entière — la plupart des hôtes l''intègrent au programme de fin d''après-midi de la nuitée.', NULL, NULL, NULL, '/images/gate.jpg', 'Une courte démonstration de pain façon tabouna, cuit directement sous le sable chaud et les braises.', '30 min', NULL, NULL, NULL, true, 'Sabria', 'La porte de Sabria, à 10 minutes au sud de Douz', 'Pain de sable', 0, 'le-pain-de-sabel', 13.000, 10.000, NULL, 'ACTIVITY', NULL, 'PER_UNIT', false, 0);


--
-- Data for Name: accommodation_pricing_rules; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: accommodation_type_features; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('d82ce109-cf17-4dd4-942f-bec05ea0b2b6', 'Tente en toile privée', 0);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('d82ce109-cf17-4dd4-942f-bec05ea0b2b6', 'Literie de qualité', 1);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('d82ce109-cf17-4dd4-942f-bec05ea0b2b6', 'Douches et toilettes du camp partagées', 2);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('d82ce109-cf17-4dd4-942f-bec05ea0b2b6', 'Dîner et petit-déjeuner inclus', 3);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('a5f21a24-9bf0-40a3-88d0-b7a8ec10d2a6', 'Chambre fermée', 0);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('a5f21a24-9bf0-40a3-88d0-b7a8ec10d2a6', 'Espace de couchage privé', 1);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('a5f21a24-9bf0-40a3-88d0-b7a8ec10d2a6', 'Literie de qualité', 2);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('a5f21a24-9bf0-40a3-88d0-b7a8ec10d2a6', 'Dîner et petit-déjeuner inclus', 3);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('8b019728-492a-456c-bdac-582a1d6c7883', 'Suite privée spacieuse', 0);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('8b019728-492a-456c-bdac-582a1d6c7883', 'Literie haut de gamme', 1);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('8b019728-492a-456c-bdac-582a1d6c7883', 'Espace salon supplémentaire', 2);
INSERT INTO public.accommodation_type_features (accommodation_type_id, feature, display_order) VALUES ('8b019728-492a-456c-bdac-582a1d6c7883', 'Dîner et petit-déjeuner inclus', 3);


--
-- Data for Name: availability_blocks; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: content_blocks; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.content_blocks (block_id, company_type, created_at, data_json, label, locale, type, updated_at) VALUES ('a53a0694-175c-4082-aaa2-24fcafadcffa', 'DUNES_INSOLITES', '2026-09-21 11:07:47.684291', '{"text":"Sample promo banner — local dev only"}', 'Dev — Promo banner', 'FR', 'promo-banner', '2026-09-21 11:07:47.684291');
INSERT INTO public.content_blocks (block_id, company_type, created_at, data_json, label, locale, type, updated_at) VALUES ('99cecb24-e5c0-4b9c-9c9e-40480fa9b28c', 'DUNES_INSOLITES', '2026-09-21 11:07:47.689712', '{"text":"Sample info banner — local dev only"}', 'Dev — Info banner', 'FR', 'info-banner', '2026-09-21 11:07:47.689712');
INSERT INTO public.content_blocks (block_id, company_type, created_at, data_json, label, locale, type, updated_at) VALUES ('af093fb6-e35b-45ce-b872-8dcdff351045', 'DUNES_INSOLITES', '2026-09-21 11:07:47.694481', '{"text":"Sample seasonal notice — local dev only"}', 'Dev — Seasonal notice', 'FR', 'seasonal-notice', '2026-09-21 11:07:47.694481');


--
-- Data for Name: extra_highlights; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: extra_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('05eb1c1e-09aa-4b8b-a630-50a70708ab2b', 'Guide local agréé et chamelier', 0);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('05eb1c1e-09aa-4b8b-a630-50a70708ab2b', 'Chèche (écharpe du désert) et couverture de selle', 1);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('05eb1c1e-09aa-4b8b-a630-50a70708ab2b', 'Thé à la menthe et dattes au campement bédouin', 2);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('05eb1c1e-09aa-4b8b-a630-50a70708ab2b', 'Prise en charge à l''hôtel à Douz et Kébili', 3);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('05eb1c1e-09aa-4b8b-a630-50a70708ab2b', 'Photos de la balade, envoyées le lendemain', 4);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('69e7618c-bd0f-46a4-a1f7-5af6f82fbc48', 'Planche fartée et fixations à votre taille', 0);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('69e7618c-bd0f-46a4-a1f7-5af6f82fbc48', 'Premières descentes encadrées par un moniteur', 1);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('69e7618c-bd0f-46a4-a1f7-5af6f82fbc48', 'Transfert en 4x4 jusqu''à la dune et retour entre les descentes', 2);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('69e7618c-bd0f-46a4-a1f7-5af6f82fbc48', 'Eau et fruits', 3);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('69e7618c-bd0f-46a4-a1f7-5af6f82fbc48', 'Vidéos de vos descentes', 4);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('d1f94e56-ae3b-4381-a937-6865f531add8', 'Menu tunisien complet : harira, salade, brik, viande cuite au feu, dessert', 0);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('d1f94e56-ae3b-4381-a937-6865f531add8', 'Thé à la menthe et dattes', 1);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('d1f94e56-ae3b-4381-a937-6865f531add8', 'Places assises sous une tente bédouine traditionnelle', 2);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('d1f94e56-ae3b-4381-a937-6865f531add8', 'Musique live autour du feu', 3);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('2323372d-f354-4a71-a78e-25b9608b2fe9', 'Tapis et coussins à l''écart des lumières du campement', 0);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('2323372d-f354-4a71-a78e-25b9608b2fe9', 'Thé à la menthe et pâtisseries tunisiennes', 1);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('2323372d-f354-4a71-a78e-25b9608b2fe9', 'Explications guidées sur le ciel, sur demande', 2);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('8635885b-e0a2-4269-8a7c-3bf0de3fba5d', 'Démonstration de pain cuit dans le sable', 0);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('8635885b-e0a2-4269-8a7c-3bf0de3fba5d', 'Huile d''olive, harissa et dattes pour l''accompagner', 1);
INSERT INTO public.extra_included_items (extra_id, item, display_order) VALUES ('8635885b-e0a2-4269-8a7c-3bf0de3fba5d', 'Façonnage participatif, si vous le souhaitez', 2);


--
-- Data for Name: extra_languages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: extra_not_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('05eb1c1e-09aa-4b8b-a630-50a70708ab2b', 'Pourboires', 0);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('05eb1c1e-09aa-4b8b-a630-50a70708ab2b', 'Dîner au campement (en option)', 1);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('05eb1c1e-09aa-4b8b-a630-50a70708ab2b', 'Assurance voyage', 2);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('69e7618c-bd0f-46a4-a1f7-5af6f82fbc48', 'Pourboires', 0);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('69e7618c-bd0f-46a4-a1f7-5af6f82fbc48', 'Moniteur privé (en option)', 1);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('69e7618c-bd0f-46a4-a1f7-5af6f82fbc48', 'Assurance voyage', 2);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('d1f94e56-ae3b-4381-a937-6865f531add8', 'Pourboires', 0);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('d1f94e56-ae3b-4381-a937-6865f531add8', 'Transport (inclus si réservé avec une nuitée)', 1);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('d1f94e56-ae3b-4381-a937-6865f531add8', 'Alcool', 2);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('2323372d-f354-4a71-a78e-25b9608b2fe9', 'Pourboires', 0);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('2323372d-f354-4a71-a78e-25b9608b2fe9', 'Transport (inclus si réservé avec une nuitée)', 1);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('8635885b-e0a2-4269-8a7c-3bf0de3fba5d', 'Pourboires', 0);
INSERT INTO public.extra_not_included_items (extra_id, item, display_order) VALUES ('8635885b-e0a2-4269-8a7c-3bf0de3fba5d', 'Transport (inclus si réservé avec une nuitée)', 1);


--
-- Data for Name: extra_photos; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: extra_pickup_fields; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: extra_program_steps; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: extra_required_pickup_fields; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: extra_resource_requirements; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: extra_translations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('a7baec0d-efd7-4f47-800a-1c032c027c25', NULL, 'Open-throttle laps across the sand sea with a lead rider and full kit.', 'EN', 'Quad Safari', '460d3fe9-4be8-48f3-8178-e7e55ada0077');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('9f71a886-ddb0-4a35-ba4a-6714498dfa8c', NULL, 'Giri a tutta velocità sul mare di sabbia con una guida in testa e attrezzatura completa.', 'IT', 'Safari in quad', '460d3fe9-4be8-48f3-8178-e7e55ada0077');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('b6b42d22-dd75-4510-9697-6dc65028d385', NULL, 'Fuld gas hen over sandhavet med en forankørende guide og fuldt udstyr.', 'DA', 'Quad-safari', '460d3fe9-4be8-48f3-8178-e7e55ada0077');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('9d7b91bd-8309-4dbd-96ea-ca5cd3ef3c16', NULL, 'جولات بأقصى سرعة عبر بحر الرمال برفقة مرشد يقود المجموعة وتجهيزات كاملة.', 'AR', 'رحلة سفاري بالدراجة الرباعية', '460d3fe9-4be8-48f3-8178-e7e55ada0077');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('7441f6a2-827f-480e-b558-89a34b877a48', NULL, 'Fahrten mit Vollgas über das Sandmeer mit einem Vorausfahrer und kompletter Ausrüstung.', 'DE', 'Quad-Safari', '460d3fe9-4be8-48f3-8178-e7e55ada0077');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('45189d37-3166-4f71-a945-4236cb84a836', 'The oldest way to cross the sand, and still the best one. You meet your caravan at the Sabria gate, climb on, and let the dromedaries set the pace — slow, rolling, unhurried.

Ninety minutes out through the dune belt brings you to a Bedouin camp where mint tea is already on the fire. You sit, you drink, you watch the light go copper over the sand sea, then ride back under the first stars.

No experience needed. Our handlers walk beside every camel the whole way, and children from six years up ride with a parent.', 'A guided caravan over the dunes to a Bedouin camp for tea and sunset.', 'EN', 'Camel Trek', '05eb1c1e-09aa-4b8b-a630-50a70708ab2b');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('0881a1dc-887b-471a-95dc-5a8461db2825', 'Die älteste Art, den Sand zu durchqueren, und immer noch die beste. Sie treffen Ihre Karawane am Tor von Sabria, steigen auf und lassen die Dromedare das Tempo bestimmen — langsam, gleichmäßig, ohne Eile.

Neunzig Minuten durch den Dünengürtel bringen Sie zu einem Beduinenlager, wo der Minztee bereits auf dem Feuer steht. Sie sitzen, trinken, beobachten, wie das Licht kupferfarben über das Sandmeer zieht, und reiten dann unter den ersten Sternen zurück.

Keine Erfahrung nötig. Unsere Kameltreiber begleiten jedes Kamel den ganzen Weg zu Fuß, und Kinder ab sechs Jahren reiten mit einem Elternteil.', 'Eine geführte Karawane durch die Dünen zu einem Beduinenlager für Tee und Sonnenuntergang.', 'DE', 'Kamelritt', '05eb1c1e-09aa-4b8b-a630-50a70708ab2b');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('5374eb24-b7bf-442e-98a0-8604ff333f02', 'Il modo più antico di attraversare la sabbia, ed è ancora il migliore. Incontrate la vostra carovana al cancello di Sabria, salite in sella e lasciate che siano i dromedari a dettare il ritmo — lento, dondolante, senza fretta.

Novanta minuti attraverso la cintura di dune vi portano a un accampamento beduino dove il tè alla menta è già sul fuoco. Vi sedete, bevete, guardate la luce diventare color rame sul mare di sabbia, poi tornate a cavallo sotto le prime stelle.

Nessuna esperienza richiesta. I nostri accompagnatori camminano accanto a ogni cammello per tutto il percorso, e i bambini dai sei anni in su cavalcano con un genitore.', 'Una carovana guidata attraverso le dune fino a un accampamento beduino per il tè e il tramonto.', 'IT', 'Trekking in cammello', '05eb1c1e-09aa-4b8b-a630-50a70708ab2b');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('1f9e2fd9-584a-48c9-a50e-dd917bea114b', 'Den ældste måde at krydse sandet på, og stadig den bedste. Du møder din karavane ved Sabrias port, kravler op, og lader dromedarerne sætte tempoet — langsomt, roligt, uden hastværk.

Halvfems minutter gennem klittebæltet bringer dig til en beduinlejr, hvor mynteten allerede står over bålet. Du sidder, drikker, ser lyset blive kobberfarvet over sandhavet, og rider tilbage under de første stjerner.

Ingen erfaring nødvendig. Vores kamelpassere går ved siden af hver kamel hele vejen, og børn fra seks år rider sammen med en forælder.', 'En guidet karavane over klitterne til en beduinlejr for te og solnedgang.', 'DA', 'Kameltrekking', '05eb1c1e-09aa-4b8b-a630-50a70708ab2b');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('740f5135-8e2f-4dec-9f03-33a25da88f06', 'أقدم طريقة لعبور الرمال، ولا تزال الأفضل. تلتقون بقافلتكم عند بوابة سابرية، وتمتطون الجمل، وتتركون الهجن تحدد الوتيرة — بطيئة، متمايلة، دون عجلة.

بعد تسعين دقيقة عبر حزام الكثبان، تصلون إلى مخيم بدوي حيث يكون شاي النعناع جاهزًا على النار. تجلسون، تشربون، تراقبون الضوء وهو يتحول إلى اللون النحاسي فوق بحر الرمال، ثم تعودون تحت أولى النجوم.

لا حاجة لخبرة سابقة. يرافق مربّو الجمال كل جمل طوال الطريق سيرًا على الأقدام، ويمكن للأطفال من سن السادسة فما فوق الركوب برفقة أحد الوالدين.', 'قافلة برفقة مرشد عبر الكثبان الرملية إلى مخيم بدوي لاحتساء الشاي ومشاهدة الغروب.', 'AR', 'رحلة على ظهر الجمل', '05eb1c1e-09aa-4b8b-a630-50a70708ab2b');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('383f0a8b-633c-456d-91ba-82016dc0679b', 'We drive you to the tallest rideable dune in the Sabria belt, wax the boards, and teach you to stand up in about ten minutes. After that the afternoon is yours.

Boards are set up for both sitting and standing runs, so it works whether you have snowboarded before or have never strapped into anything. Instructors ride with you and film the good runs.

The dune faces west, which means the last hour of the session is straight into the sunset.', 'Carve the tallest dunes on a waxed board — beginners to freeriders.', 'EN', 'Sandboarding', '69e7618c-bd0f-46a4-a1f7-5af6f82fbc48');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('45dc8dac-576c-4c4a-8287-313613f4e7e0', 'Wir bringen Sie zur höchsten befahrbaren Düne im Sabria-Gürtel, wachsen die Boards und bringen Ihnen in etwa zehn Minuten bei, wie man aufsteht. Danach gehört Ihnen der Nachmittag.

Die Boards sind sowohl für sitzende als auch stehende Abfahrten ausgelegt, das funktioniert also egal, ob Sie schon einmal Snowboard gefahren sind oder noch nie etwas angeschnallt haben. Die Instruktoren fahren mit Ihnen mit und filmen die gelungenen Läufe.

Die Düne ist nach Westen ausgerichtet, sodass die letzte Stunde der Session direkt im Sonnenuntergang stattfindet.', 'Die höchsten Dünen auf einem gewachsten Board hinunterfahren — für Anfänger und Freerider.', 'DE', 'Sandboarding', '69e7618c-bd0f-46a4-a1f7-5af6f82fbc48');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('6a0abdbb-3252-4016-88a8-586ca4efc225', 'Vi portiamo sulla duna più alta percorribile della cintura di Sabria, inceriamo le tavole e vi insegniamo ad alzarvi in piedi in circa dieci minuti. Dopodiché il pomeriggio è vostro.

Le tavole sono predisposte sia per le discese da seduti che in piedi, quindi funziona sia che abbiate già fatto snowboard sia che non abbiate mai calzato nulla del genere. Gli istruttori scendono con voi e filmano le discese migliori.

La duna è esposta a ovest, quindi l''ultima ora della sessione si svolge proprio verso il tramonto.', 'Scendete le dune più alte su una tavola incerata — dai principianti ai freerider.', 'IT', 'Sandboarding', '69e7618c-bd0f-46a4-a1f7-5af6f82fbc48');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('c6dbc365-ed94-4c71-a717-17dfdc19be08', 'Vi kører dig til den højeste klit, man kan køre på, i Sabria-bæltet, vokser boardene og lærer dig at stå op på cirka ti minutter. Derefter er eftermiddagen din.

Boardene er indrettet til både siddende og stående kørsel, så det fungerer, uanset om du har stået på snowboard før eller aldrig har haft noget spændt fast under fødderne. Instruktørerne kører med dig og filmer de gode ture.

Klitten vender mod vest, så sessionens sidste time foregår lige ind i solnedgangen.', 'Kør ned ad de højeste klitter på et vokset board — for begyndere og øvede.', 'DA', 'Sandboarding', '69e7618c-bd0f-46a4-a1f7-5af6f82fbc48');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('c19effca-6c3b-412b-86d7-a08cbac97daf', 'نأخذكم إلى أعلى كثيب يمكن التزلج عليه في حزام سابرية، نقوم بتشميع الألواح، ونعلمكم الوقوف خلال عشر دقائق تقريبًا. بعد ذلك، يصبح المساء ملكًا لكم.

الألواح مهيأة للانزلاق جلوسًا أو وقوفًا، لذا تناسب الجميع سواء مارستم التزلج على الثلج من قبل أو لم يسبق أن ارتديتم أي معدات مماثلة. يرافقكم المدربون في الانزلاق ويصورون أفضل اللحظات.

الكثيب متجه نحو الغرب، ما يعني أن الساعة الأخيرة من الجلسة تكون باتجاه غروب الشمس مباشرة.', 'انزلقوا على أعلى الكثبان بلوح مشمّع — للمبتدئين والمحترفين.', 'AR', 'التزلج على الرمال', '69e7618c-bd0f-46a4-a1f7-5af6f82fbc48');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('75914e3b-a1d4-4e99-904e-221bb77935a3', 'Harira, Tunisian salad, brik, and meat cooked slowly over the coals — the same meal the camp''s own families have served guests for years, eaten under a low Bedouin tent lit by lamp and firelight.

This runs as a stand-alone evening for day visitors, or as the dinner included in either nuitée. Either way, it ends the same: mint tea, dates, and whoever''s got an oud that night.

Vegetarian and no-pork options are always available — just say so when booking.', 'A fire-cooked Tunisian dinner served under a Bedouin tent, with music around the fire after.', 'EN', 'Bedouin Dinner', 'd1f94e56-ae3b-4381-a937-6865f531add8');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('6f534df3-2079-4ccc-aa16-2b204e3c79cb', 'Harira, tunesischer Salat, Brik und langsam auf der Glut gegartes Fleisch — dieselbe Mahlzeit, die die Familien des Lagers ihren Gästen seit Jahren servieren, eingenommen unter einem niedrigen, von Lampe und Feuerschein erleuchteten Beduinenzelt.

Dieser Abend findet als eigenständige Veranstaltung für Tagesgäste statt oder als im Übernachtungspaket enthaltenes Abendessen. So oder so endet er gleich: Minztee, Datteln, und wer immer an diesem Abend eine Oud dabei hat.

Vegetarische und schweinefleischfreie Optionen sind immer verfügbar — bei der Buchung einfach angeben.', 'Ein am Feuer gekochtes tunesisches Abendessen, serviert unter einem Beduinenzelt, danach Musik am Feuer.', 'DE', 'Beduinen-Abendessen', 'd1f94e56-ae3b-4381-a937-6865f531add8');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('93f58954-880d-42f5-b02f-67e7322d3f22', 'Harira, insalata tunisina, brik e carne cotta lentamente sulla brace — lo stesso pasto che le famiglie dell''accampamento servono ai propri ospiti da anni, consumato sotto una bassa tenda beduina illuminata da lampade e dal fuoco.

Questa serata si svolge come evento autonomo per i visitatori giornalieri, oppure come cena inclusa in una delle due formule di pernottamento. In entrambi i casi finisce allo stesso modo: tè alla menta, datteri, e chiunque abbia portato un oud quella sera.

Opzioni vegetariane e senza maiale sono sempre disponibili — basta segnalarlo al momento della prenotazione.', 'Una cena tunisina cotta sul fuoco, servita sotto una tenda beduina, seguita da musica intorno al fuoco.', 'IT', 'Cena beduina', 'd1f94e56-ae3b-4381-a937-6865f531add8');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('712551d8-831f-435d-8985-ebf6b14ad535', 'Harira, tunesisk salat, brik og kød tilberedt langsomt over gløderne — det samme måltid, som lejrens egne familier har serveret for gæster i årevis, indtaget under et lavt beduintelt oplyst af lampe og bål.

Dette foregår som en selvstændig aften for dagsgæster, eller som den middag, der er inkluderet i begge overnatningstyper. Uanset hvad slutter det på samme måde: mynteté, dadler, og hvem end der har en oud med den aften.

Vegetariske og svinekødsfrie muligheder er altid tilgængelige — sig blot til ved bookingen.', 'En bålstegt tunesisk middag serveret under et beduintelt, med musik omkring bålet bagefter.', 'DA', 'Beduinmiddag', 'd1f94e56-ae3b-4381-a937-6865f531add8');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('41a8ffe7-21a1-4536-86b2-146a333ebcd9', 'الحريرة، والسلطة التونسية، والبريك، ولحم يُطهى ببطء على الجمر — نفس الوجبة التي تقدمها عائلات المخيم لضيوفها منذ سنوات، تُؤكل تحت خيمة بدوية منخفضة مضاءة بالمصباح وضوء النار.

تُقام هذه السهرة كأمسية مستقلة للزوار النهاريين، أو كعشاء ضمن إحدى ليلتي المبيت. في الحالتين، تنتهي بنفس الطريقة: شاي بالنعناع، وتمر، ومن يحمل آلة العود تلك الليلة.

الخيارات النباتية والخالية من لحم الخنزير متوفرة دائمًا — يكفي الإشارة إلى ذلك عند الحجز.', 'عشاء تونسي يُطهى على النار، يُقدَّم تحت خيمة بدوية، تعقبه موسيقى حول النار.', 'AR', 'عشاء بدوي', 'd1f94e56-ae3b-4381-a937-6865f531add8');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('e17d07e8-1a88-44ac-a678-9543e5c078a8', 'Sabria sits far enough from any town that the sky does something most guests have never actually seen: the full Milky Way, no glow on the horizon, no need to wait for your eyes to adjust twice.

We lay out mats and cushions away from the camp''s lights, bring mint tea and pastries, and point out what''s overhead if you''re curious — otherwise it''s just quiet.

Runs every clear night as part of a nuitée, or as its own booking for guests staying nearby.', 'A quiet evening by the fire under one of the darkest skies in Tunisia, tea and stargazing included.', 'EN', 'Evenings Under the Stars', '2323372d-f354-4a71-a78e-25b9608b2fe9');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('56639aa2-3474-4aff-bf27-c814dc812b28', 'Sabria liegt weit genug von jeder Stadt entfernt, dass der Himmel etwas zeigt, das die meisten Gäste noch nie gesehen haben: die vollständige Milchstraße, kein Lichtschein am Horizont, kein zweimaliges Warten, bis sich die Augen anpassen.

Wir breiten Matten und Kissen abseits der Lichter des Lagers aus, bringen Minztee und Gebäck mit und zeigen auf Wunsch, was gerade am Himmel zu sehen ist — ansonsten herrscht einfach Stille.

Findet in jeder klaren Nacht als Teil einer Übernachtung statt, oder als eigenständige Buchung für Gäste, die in der Nähe wohnen.', 'Ein ruhiger Abend am Feuer unter einem der dunkelsten Himmel Tunesiens, Tee und Sternbeobachtung inklusive.', 'DE', 'Abende unter den Sternen', '2323372d-f354-4a71-a78e-25b9608b2fe9');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('43ed9ddb-f538-4321-a7cc-c3bec43621a1', 'Sabria si trova abbastanza lontana da ogni città perché il cielo mostri qualcosa che la maggior parte degli ospiti non ha mai visto davvero: la Via Lattea per intero, nessun bagliore all''orizzonte, nessun bisogno di aspettare due volte che gli occhi si abituino.

Stendiamo tappeti e cuscini lontano dalle luci dell''accampamento, portiamo tè alla menta e dolci, e indichiamo cosa si vede in cielo se siete curiosi — altrimenti regna solo la quiete.

Si svolge ogni notte serena come parte di un pernottamento, oppure come prenotazione a sé per gli ospiti che alloggiano nei dintorni.', 'Una serata tranquilla accanto al fuoco sotto uno dei cieli più bui della Tunisia, tè e osservazione delle stelle inclusi.', 'IT', 'Serate sotto le stelle', '2323372d-f354-4a71-a78e-25b9608b2fe9');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('be70b736-a77b-4f80-9376-c02d0e5c5860', 'Sabria ligger langt nok fra enhver by til, at himlen viser noget, de fleste gæster aldrig rigtig har set før: hele Mælkevejen, intet lysskær i horisonten, intet behov for at vente to gange på, at øjnene vænner sig til mørket.

Vi lægger måtter og puder ud væk fra lejrens lys, medbringer mynteté og bagværk, og peger på, hvad der er at se på himlen, hvis du er nysgerrig — ellers er det bare stille.

Foregår hver klar nat som en del af en overnatning, eller som en selvstændig booking for gæster, der bor i nærheden.', 'En stille aften ved bålet under en af Tunesiens mørkeste himle, te og stjernekiggeri inkluderet.', 'DA', 'Aftener under stjernerne', '2323372d-f354-4a71-a78e-25b9608b2fe9');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('074416d0-015f-4f0b-bd5c-b3657f77ed4a', 'تقع سابرية بعيدًا بما يكفي عن أي مدينة بحيث تكشف السماء عن شيء لم يره معظم الضيوف من قبل حقًا: درب التبانة كاملًا، دون أي وهج عند الأفق، ودون الحاجة لانتظار تكيّف العين مرتين.

نفرش الحصائر والوسائد بعيدًا عن أضواء المخيم، ونحضر شاي النعناع والحلويات، ونشير إلى ما يمكن رؤيته في السماء إن كنتم فضوليين — وإلا فالهدوء هو سيد الموقف.

تُقام كل ليلة صافية كجزء من إحدى ليلتي المبيت، أو كحجز مستقل للضيوف المقيمين في الجوار.', 'أمسية هادئة قرب النار تحت واحدة من أكثر سماوات تونس ظلامًا، مع شاي ومراقبة للنجوم.', 'AR', 'أمسيات تحت النجوم', '2323372d-f354-4a71-a78e-25b9608b2fe9');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('ae803972-8fb1-46c5-80ab-1cf378278101', 'A bed of embers goes down first, then sand on top of that, then the dough goes straight into the dune itself — no oven, no tray. Twenty minutes later it comes out dusted off, cracked open, and still steaming.

Guests are welcome to shape their own loaf before it goes in. It comes back out with olive oil, harissa, and dates alongside — usually as part of the sunset routine, before dinner.

A short, hands-on demonstration rather than a full activity — most guests fold it into the nuitée''s late-afternoon programme.', 'A short demonstration of tabouna-style bread baked directly under hot sand and embers.', 'EN', 'Sand Bread', '8635885b-e0a2-4269-8a7c-3bf0de3fba5d');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('9e148c33-bc22-4e00-9a65-4fee62f8099a', 'Zuerst kommt ein Glutbett, dann Sand darüber, dann wird der Teig direkt in die Düne selbst vergraben — kein Ofen, kein Blech. Zwanzig Minuten später kommt er abgeklopft, aufgebrochen und noch dampfend wieder heraus.

Gäste dürfen ihren eigenen Laib formen, bevor er hineinkommt. Er kommt mit Olivenöl, Harissa und Datteln zurück — meist als Teil des Sonnenuntergangs-Rituals vor dem Abendessen.

Eine kurze, zum Mitmachen einladende Vorführung statt einer vollständigen Aktivität — die meisten Gäste integrieren sie in das Spätnachmittagsprogramm der Übernachtung.', 'Eine kurze Vorführung von Tabouna-Brot, das direkt unter heißem Sand und Glut gebacken wird.', 'DE', 'Sandbrot', '8635885b-e0a2-4269-8a7c-3bf0de3fba5d');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('dec31bd3-156a-459a-8874-caf3186f82f8', 'Per prima cosa si stende un letto di brace, poi la sabbia sopra, poi l''impasto va direttamente nella duna stessa — niente forno, niente teglia. Venti minuti dopo esce spolverato, screpolato e ancora fumante.

Gli ospiti sono invitati a formare il proprio pane prima della cottura. Torna accompagnato da olio d''oliva, harissa e datteri — di solito come parte del rituale del tramonto, prima della cena.

Una dimostrazione breve e pratica più che un''attività a sé — la maggior parte degli ospiti la inserisce nel programma del tardo pomeriggio del pernottamento.', 'Una breve dimostrazione di pane in stile tabouna, cotto direttamente sotto sabbia calda e brace.', 'IT', 'Pane di sabbia', '8635885b-e0a2-4269-8a7c-3bf0de3fba5d');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('2560cfa0-f471-4d76-938b-cf068f6f1874', 'Først lægges et lag gløder, så sand ovenpå, og derefter går dejen direkte ned i selve klitten — ingen ovn, ingen bageplade. Tyve minutter senere kommer det op, børstet af, brækket op og stadig dampende.

Gæster er velkomne til at forme deres eget brød, før det går i sandet. Det kommer tilbage med olivenolie, harissa og dadler ved siden af — sædvanligvis som en del af solnedgangsritualet før aftensmaden.

En kort, praktisk demonstration snarere end en fuld aktivitet — de fleste gæster lægger den ind i overnatningens sene eftermiddagsprogram.', 'En kort demonstration af tabouna-brød, bagt direkte under varmt sand og gløder.', 'DA', 'Sandbrød', '8635885b-e0a2-4269-8a7c-3bf0de3fba5d');
INSERT INTO public.extra_translations (extra_translation_id, about_text, description, locale, name, extra_id) VALUES ('cf1d67f3-0724-45ba-836b-c5dccf605b76', 'توضع طبقة من الجمر أولًا، ثم الرمل فوقها، ثم توضع العجينة مباشرة داخل الكثيب نفسه — دون فرن ودون صينية. بعد عشرين دقيقة، يخرج الخبز منفوضًا ومتشققًا وما يزال يتصاعد منه البخار.

الضيوف مدعوون لتشكيل رغيفهم الخاص قبل خبزه. يعود مصحوبًا بزيت الزيتون والهريسة والتمر — عادة كجزء من طقوس الغروب، قبل العشاء.

عرض قصير وتفاعلي أكثر من كونه نشاطًا كاملاً — يدمجه معظم الضيوف في برنامج أواخر بعد الظهر ضمن إحدى ليلتي المبيت.', 'عرض قصير لخبز على طريقة الطابونة، يُخبز مباشرة تحت الرمل الساخن والجمر.', 'AR', 'خبز الرمل', '8635885b-e0a2-4269-8a7c-3bf0de3fba5d');


--
-- Data for Name: extra_translation_highlights; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: extra_translation_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45189d37-3166-4f71-a945-4236cb84a836', 'Licensed local guide and camel handler', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45189d37-3166-4f71-a945-4236cb84a836', 'Chèche (desert scarf) and saddle blanket', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45189d37-3166-4f71-a945-4236cb84a836', 'Mint tea and dates at the Bedouin camp', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45189d37-3166-4f71-a945-4236cb84a836', 'Hotel pickup within Douz and Kebili', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45189d37-3166-4f71-a945-4236cb84a836', 'Photos from the ride, sent the next day', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('0881a1dc-887b-471a-95dc-5a8461db2825', 'Lizenzierter lokaler Guide und Kameltreiber', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('0881a1dc-887b-471a-95dc-5a8461db2825', 'Chèche (Wüstenschal) und Sattelunterlage', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('0881a1dc-887b-471a-95dc-5a8461db2825', 'Minztee und Datteln im Beduinenlager', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('0881a1dc-887b-471a-95dc-5a8461db2825', 'Hotelabholung in Douz und Kebili', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('0881a1dc-887b-471a-95dc-5a8461db2825', 'Fotos vom Ritt, am nächsten Tag zugesandt', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('5374eb24-b7bf-442e-98a0-8604ff333f02', 'Guida locale autorizzata e accompagnatore dei cammelli', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('5374eb24-b7bf-442e-98a0-8604ff333f02', 'Chèche (sciarpa del deserto) e coperta da sella', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('5374eb24-b7bf-442e-98a0-8604ff333f02', 'Tè alla menta e datteri all''accampamento beduino', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('5374eb24-b7bf-442e-98a0-8604ff333f02', 'Ritiro in hotel a Douz e Kebili', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('5374eb24-b7bf-442e-98a0-8604ff333f02', 'Foto della cavalcata, inviate il giorno successivo', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('1f9e2fd9-584a-48c9-a50e-dd917bea114b', 'Autoriseret lokal guide og kamelpasser', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('1f9e2fd9-584a-48c9-a50e-dd917bea114b', 'Chèche (ørkentørklæde) og sadeltæppe', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('1f9e2fd9-584a-48c9-a50e-dd917bea114b', 'Mynteté og dadler i beduinlejren', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('1f9e2fd9-584a-48c9-a50e-dd917bea114b', 'Afhentning på hotel i Douz og Kebili', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('1f9e2fd9-584a-48c9-a50e-dd917bea114b', 'Billeder fra turen, sendt dagen efter', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('740f5135-8e2f-4dec-9f03-33a25da88f06', 'مرشد محلي مرخّص ومربي جمال', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('740f5135-8e2f-4dec-9f03-33a25da88f06', 'الشيش (وشاح الصحراء) وغطاء السرج', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('740f5135-8e2f-4dec-9f03-33a25da88f06', 'شاي بالنعناع وتمر في المخيم البدوي', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('740f5135-8e2f-4dec-9f03-33a25da88f06', 'خدمة النقل من الفندق في دوز وقبلي', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('740f5135-8e2f-4dec-9f03-33a25da88f06', 'صور من الرحلة، تُرسل في اليوم التالي', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('383f0a8b-633c-456d-91ba-82016dc0679b', 'Waxed board and bindings in your size', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('383f0a8b-633c-456d-91ba-82016dc0679b', 'Instructor-led first runs', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('383f0a8b-633c-456d-91ba-82016dc0679b', '4x4 transfer to the dune and back up between runs', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('383f0a8b-633c-456d-91ba-82016dc0679b', 'Water and fruit', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('383f0a8b-633c-456d-91ba-82016dc0679b', 'Video clips of your runs', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45dc8dac-576c-4c4a-8287-313613f4e7e0', 'Gewachstes Board und Bindung in Ihrer Größe', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45dc8dac-576c-4c4a-8287-313613f4e7e0', 'Erste Abfahrten unter Anleitung eines Instruktors', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45dc8dac-576c-4c4a-8287-313613f4e7e0', '4x4-Transfer zur Düne und zurück zwischen den Läufen', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45dc8dac-576c-4c4a-8287-313613f4e7e0', 'Wasser und Obst', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('45dc8dac-576c-4c4a-8287-313613f4e7e0', 'Videoclips Ihrer Abfahrten', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('6a0abdbb-3252-4016-88a8-586ca4efc225', 'Tavola incerata e attacchi della vostra misura', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('6a0abdbb-3252-4016-88a8-586ca4efc225', 'Prime discese guidate da un istruttore', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('6a0abdbb-3252-4016-88a8-586ca4efc225', 'Trasferimento in 4x4 alla duna e ritorno tra una discesa e l''altra', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('6a0abdbb-3252-4016-88a8-586ca4efc225', 'Acqua e frutta', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('6a0abdbb-3252-4016-88a8-586ca4efc225', 'Video clip delle vostre discese', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c6dbc365-ed94-4c71-a717-17dfdc19be08', 'Vokset board og bindinger i din størrelse', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c6dbc365-ed94-4c71-a717-17dfdc19be08', 'Instruktørledede første ture', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c6dbc365-ed94-4c71-a717-17dfdc19be08', '4x4-transport til klitten og tilbage mellem ture', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c6dbc365-ed94-4c71-a717-17dfdc19be08', 'Vand og frugt', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c6dbc365-ed94-4c71-a717-17dfdc19be08', 'Videoklip af dine ture', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c19effca-6c3b-412b-86d7-a08cbac97daf', 'لوح مشمّع ورباطات بمقاسكم', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c19effca-6c3b-412b-86d7-a08cbac97daf', 'أولى الجولات بإشراف مدرب', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c19effca-6c3b-412b-86d7-a08cbac97daf', 'نقل بسيارة دفع رباعي إلى الكثيب وعودة بين الجولات', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c19effca-6c3b-412b-86d7-a08cbac97daf', 'ماء وفواكه', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('c19effca-6c3b-412b-86d7-a08cbac97daf', 'مقاطع فيديو لجولاتكم', 4);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('75914e3b-a1d4-4e99-904e-221bb77935a3', 'Full Tunisian menu: harira, salad, brik, fire-cooked meat, dessert', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('75914e3b-a1d4-4e99-904e-221bb77935a3', 'Mint tea and dates', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('75914e3b-a1d4-4e99-904e-221bb77935a3', 'Seating under a traditional Bedouin tent', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('75914e3b-a1d4-4e99-904e-221bb77935a3', 'Live music around the fire', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('6f534df3-2079-4ccc-aa16-2b204e3c79cb', 'Vollständiges tunesisches Menü: Harira, Salat, Brik, am Feuer gegartes Fleisch, Dessert', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('6f534df3-2079-4ccc-aa16-2b204e3c79cb', 'Minztee und Datteln', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('6f534df3-2079-4ccc-aa16-2b204e3c79cb', 'Sitzplätze unter einem traditionellen Beduinenzelt', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('6f534df3-2079-4ccc-aa16-2b204e3c79cb', 'Live-Musik am Feuer', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('93f58954-880d-42f5-b02f-67e7322d3f22', 'Menu tunisino completo: harira, insalata, brik, carne cotta sul fuoco, dolce', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('93f58954-880d-42f5-b02f-67e7322d3f22', 'Tè alla menta e datteri', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('93f58954-880d-42f5-b02f-67e7322d3f22', 'Posti a sedere sotto una tradizionale tenda beduina', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('93f58954-880d-42f5-b02f-67e7322d3f22', 'Musica dal vivo intorno al fuoco', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('712551d8-831f-435d-8985-ebf6b14ad535', 'Fuld tunesisk menu: harira, salat, brik, bålstegt kød, dessert', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('712551d8-831f-435d-8985-ebf6b14ad535', 'Mynteté og dadler', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('712551d8-831f-435d-8985-ebf6b14ad535', 'Siddepladser under et traditionelt beduintelt', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('712551d8-831f-435d-8985-ebf6b14ad535', 'Levende musik omkring bålet', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('41a8ffe7-21a1-4536-86b2-146a333ebcd9', 'قائمة تونسية كاملة: حريرة، سلطة، بريك، لحم مشوي على النار، حلوى', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('41a8ffe7-21a1-4536-86b2-146a333ebcd9', 'شاي بالنعناع وتمر', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('41a8ffe7-21a1-4536-86b2-146a333ebcd9', 'جلوس تحت خيمة بدوية تقليدية', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('41a8ffe7-21a1-4536-86b2-146a333ebcd9', 'موسيقى حية حول النار', 3);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('e17d07e8-1a88-44ac-a678-9543e5c078a8', 'Mats and cushions away from camp light', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('e17d07e8-1a88-44ac-a678-9543e5c078a8', 'Mint tea and Tunisian pastries', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('e17d07e8-1a88-44ac-a678-9543e5c078a8', 'Guided pointers on what''s overhead, on request', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('56639aa2-3474-4aff-bf27-c814dc812b28', 'Matten und Kissen abseits des Lagerlichts', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('56639aa2-3474-4aff-bf27-c814dc812b28', 'Minztee und tunesisches Gebäck', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('56639aa2-3474-4aff-bf27-c814dc812b28', 'Geführte Erklärungen zum Sternenhimmel, auf Anfrage', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('43ed9ddb-f538-4321-a7cc-c3bec43621a1', 'Tappeti e cuscini lontano dalle luci dell''accampamento', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('43ed9ddb-f538-4321-a7cc-c3bec43621a1', 'Tè alla menta e dolci tunisini', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('43ed9ddb-f538-4321-a7cc-c3bec43621a1', 'Spiegazioni guidate sul cielo, su richiesta', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('be70b736-a77b-4f80-9376-c02d0e5c5860', 'Måtter og puder væk fra lejrens lys', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('be70b736-a77b-4f80-9376-c02d0e5c5860', 'Mynteté og tunesisk bagværk', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('be70b736-a77b-4f80-9376-c02d0e5c5860', 'Guidede forklaringer om stjernehimlen, efter ønske', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('074416d0-015f-4f0b-bd5c-b3657f77ed4a', 'حصائر ووسائد بعيدًا عن أضواء المخيم', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('074416d0-015f-4f0b-bd5c-b3657f77ed4a', 'شاي بالنعناع وحلويات تونسية', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('074416d0-015f-4f0b-bd5c-b3657f77ed4a', 'شرح موجّه لما يمكن رؤيته في السماء، عند الطلب', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('ae803972-8fb1-46c5-80ab-1cf378278101', 'Sand-baked bread demonstration', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('ae803972-8fb1-46c5-80ab-1cf378278101', 'Olive oil, harissa, and dates to taste it with', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('ae803972-8fb1-46c5-80ab-1cf378278101', 'Hands-on shaping, if you''d like to try', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('9e148c33-bc22-4e00-9a65-4fee62f8099a', 'Vorführung von im Sand gebackenem Brot', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('9e148c33-bc22-4e00-9a65-4fee62f8099a', 'Olivenöl, Harissa und Datteln zum Probieren', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('9e148c33-bc22-4e00-9a65-4fee62f8099a', 'Mitmach-Formen, wenn gewünscht', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('dec31bd3-156a-459a-8874-caf3186f82f8', 'Dimostrazione di pane cotto nella sabbia', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('dec31bd3-156a-459a-8874-caf3186f82f8', 'Olio d''oliva, harissa e datteri per accompagnarlo', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('dec31bd3-156a-459a-8874-caf3186f82f8', 'Formatura pratica, se lo desiderate', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('2560cfa0-f471-4d76-938b-cf068f6f1874', 'Demonstration af sandbagt brød', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('2560cfa0-f471-4d76-938b-cf068f6f1874', 'Olivenolie, harissa og dadler at smage det med', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('2560cfa0-f471-4d76-938b-cf068f6f1874', 'Praktisk formning, hvis du har lyst', 2);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('cf1d67f3-0724-45ba-836b-c5dccf605b76', 'عرض لخبز يُخبز في الرمال', 0);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('cf1d67f3-0724-45ba-836b-c5dccf605b76', 'زيت زيتون وهريسة وتمر لتذوقه معه', 1);
INSERT INTO public.extra_translation_included_items (extra_translation_id, item, display_order) VALUES ('cf1d67f3-0724-45ba-836b-c5dccf605b76', 'تشكيل العجين يدويًا، إن رغبتم في التجربة', 2);


--
-- Data for Name: extra_translation_not_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('45189d37-3166-4f71-a945-4236cb84a836', 'Gratuities', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('45189d37-3166-4f71-a945-4236cb84a836', 'Dinner at the camp (add-on)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('45189d37-3166-4f71-a945-4236cb84a836', 'Travel insurance', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('0881a1dc-887b-471a-95dc-5a8461db2825', 'Trinkgelder', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('0881a1dc-887b-471a-95dc-5a8461db2825', 'Abendessen im Lager (Zusatzoption)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('0881a1dc-887b-471a-95dc-5a8461db2825', 'Reiseversicherung', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('5374eb24-b7bf-442e-98a0-8604ff333f02', 'Mance', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('5374eb24-b7bf-442e-98a0-8604ff333f02', 'Cena all''accampamento (opzionale)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('5374eb24-b7bf-442e-98a0-8604ff333f02', 'Assicurazione di viaggio', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('1f9e2fd9-584a-48c9-a50e-dd917bea114b', 'Drikkepenge', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('1f9e2fd9-584a-48c9-a50e-dd917bea114b', 'Aftensmad i lejren (tilkøb)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('1f9e2fd9-584a-48c9-a50e-dd917bea114b', 'Rejseforsikring', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('740f5135-8e2f-4dec-9f03-33a25da88f06', 'الإكراميات', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('740f5135-8e2f-4dec-9f03-33a25da88f06', 'العشاء في المخيم (خيار إضافي)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('740f5135-8e2f-4dec-9f03-33a25da88f06', 'التأمين على السفر', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('383f0a8b-633c-456d-91ba-82016dc0679b', 'Gratuities', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('383f0a8b-633c-456d-91ba-82016dc0679b', 'Private instructor (add-on)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('383f0a8b-633c-456d-91ba-82016dc0679b', 'Travel insurance', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('45dc8dac-576c-4c4a-8287-313613f4e7e0', 'Trinkgelder', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('45dc8dac-576c-4c4a-8287-313613f4e7e0', 'Privater Instruktor (Zusatzoption)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('45dc8dac-576c-4c4a-8287-313613f4e7e0', 'Reiseversicherung', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('6a0abdbb-3252-4016-88a8-586ca4efc225', 'Mance', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('6a0abdbb-3252-4016-88a8-586ca4efc225', 'Istruttore privato (opzionale)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('6a0abdbb-3252-4016-88a8-586ca4efc225', 'Assicurazione di viaggio', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('c6dbc365-ed94-4c71-a717-17dfdc19be08', 'Drikkepenge', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('c6dbc365-ed94-4c71-a717-17dfdc19be08', 'Privat instruktør (tilkøb)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('c6dbc365-ed94-4c71-a717-17dfdc19be08', 'Rejseforsikring', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('c19effca-6c3b-412b-86d7-a08cbac97daf', 'الإكراميات', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('c19effca-6c3b-412b-86d7-a08cbac97daf', 'مدرب خاص (خيار إضافي)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('c19effca-6c3b-412b-86d7-a08cbac97daf', 'التأمين على السفر', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('75914e3b-a1d4-4e99-904e-221bb77935a3', 'Gratuities', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('75914e3b-a1d4-4e99-904e-221bb77935a3', 'Transport (included if booked with a nuitée)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('75914e3b-a1d4-4e99-904e-221bb77935a3', 'Alcohol', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('6f534df3-2079-4ccc-aa16-2b204e3c79cb', 'Trinkgelder', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('6f534df3-2079-4ccc-aa16-2b204e3c79cb', 'Transport (inklusive bei Buchung mit Übernachtung)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('6f534df3-2079-4ccc-aa16-2b204e3c79cb', 'Alkohol', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('93f58954-880d-42f5-b02f-67e7322d3f22', 'Mance', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('93f58954-880d-42f5-b02f-67e7322d3f22', 'Trasporto (incluso se prenotato con un pernottamento)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('93f58954-880d-42f5-b02f-67e7322d3f22', 'Alcolici', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('712551d8-831f-435d-8985-ebf6b14ad535', 'Drikkepenge', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('712551d8-831f-435d-8985-ebf6b14ad535', 'Transport (inkluderet ved booking med overnatning)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('712551d8-831f-435d-8985-ebf6b14ad535', 'Alkohol', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('41a8ffe7-21a1-4536-86b2-146a333ebcd9', 'الإكراميات', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('41a8ffe7-21a1-4536-86b2-146a333ebcd9', 'النقل (مشمول عند الحجز مع إحدى ليالي المبيت)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('41a8ffe7-21a1-4536-86b2-146a333ebcd9', 'المشروبات الكحولية', 2);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('e17d07e8-1a88-44ac-a678-9543e5c078a8', 'Gratuities', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('e17d07e8-1a88-44ac-a678-9543e5c078a8', 'Transport (included if booked with a nuitée)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('56639aa2-3474-4aff-bf27-c814dc812b28', 'Trinkgelder', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('56639aa2-3474-4aff-bf27-c814dc812b28', 'Transport (inklusive bei Buchung mit Übernachtung)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('43ed9ddb-f538-4321-a7cc-c3bec43621a1', 'Mance', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('43ed9ddb-f538-4321-a7cc-c3bec43621a1', 'Trasporto (incluso se prenotato con un pernottamento)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('be70b736-a77b-4f80-9376-c02d0e5c5860', 'Drikkepenge', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('be70b736-a77b-4f80-9376-c02d0e5c5860', 'Transport (inkluderet ved booking med overnatning)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('074416d0-015f-4f0b-bd5c-b3657f77ed4a', 'الإكراميات', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('074416d0-015f-4f0b-bd5c-b3657f77ed4a', 'النقل (مشمول عند الحجز مع إحدى ليالي المبيت)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('ae803972-8fb1-46c5-80ab-1cf378278101', 'Gratuities', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('ae803972-8fb1-46c5-80ab-1cf378278101', 'Transport (included if booked with a nuitée)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('9e148c33-bc22-4e00-9a65-4fee62f8099a', 'Trinkgelder', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('9e148c33-bc22-4e00-9a65-4fee62f8099a', 'Transport (inklusive bei Buchung mit Übernachtung)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('dec31bd3-156a-459a-8874-caf3186f82f8', 'Mance', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('dec31bd3-156a-459a-8874-caf3186f82f8', 'Trasporto (incluso se prenotato con un pernottamento)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('2560cfa0-f471-4d76-938b-cf068f6f1874', 'Drikkepenge', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('2560cfa0-f471-4d76-938b-cf068f6f1874', 'Transport (inkluderet ved booking med overnatning)', 1);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('cf1d67f3-0724-45ba-836b-c5dccf605b76', 'الإكراميات', 0);
INSERT INTO public.extra_translation_not_included_items (extra_translation_id, item, display_order) VALUES ('cf1d67f3-0724-45ba-836b-c5dccf605b76', 'النقل (مشمول عند الحجز مع إحدى ليالي المبيت)', 1);


--
-- Data for Name: extra_translation_program_steps; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: gallery_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.gallery_items (gallery_item_id, image_url, alt, tag, tall, "position", company_type, created_at, updated_at) VALUES ('7556f5ae-3e7c-4c14-ada6-730cf29cb958', '/images/hero-combined.jpg', 'Camel, quads and sandboarding on one dune', 'All', true, 0, 'DUNES_INSOLITES', '2026-09-21 11:07:47.089187', '2026-09-21 11:07:47.089187');
INSERT INTO public.gallery_items (gallery_item_id, image_url, alt, tag, tall, "position", company_type, created_at, updated_at) VALUES ('1bc1c7b3-fb57-4dce-b113-1521aea993c9', '/images/camel.jpg', 'Camel trek at golden hour', 'Camel Trek', false, 1, 'DUNES_INSOLITES', '2026-09-21 11:07:47.095091', '2026-09-21 11:07:47.095091');
INSERT INTO public.gallery_items (gallery_item_id, image_url, alt, tag, tall, "position", company_type, created_at, updated_at) VALUES ('49dccc47-941e-4c69-99bb-2522d52ee918', '/images/quad.jpg', 'Quad bikes crossing the sand sea', 'Quad Safari', false, 2, 'DUNES_INSOLITES', '2026-09-21 11:07:47.099347', '2026-09-21 11:07:47.099347');
INSERT INTO public.gallery_items (gallery_item_id, image_url, alt, tag, tall, "position", company_type, created_at, updated_at) VALUES ('99db4a39-ed82-4b82-8ade-1bbf73b1907d', '/images/gate.jpg', 'The lantern-lit Sabria gate', 'The Gate', true, 3, 'DUNES_INSOLITES', '2026-09-21 11:07:47.103612', '2026-09-21 11:07:47.103612');
INSERT INTO public.gallery_items (gallery_item_id, image_url, alt, tag, tall, "position", company_type, created_at, updated_at) VALUES ('a81919af-0787-4b57-862d-bd5a1672fe36', '/images/sandboard.jpg', 'Sandboarder carving a dune face', 'Sandboarding', false, 4, 'DUNES_INSOLITES', '2026-09-21 11:07:47.108416', '2026-09-21 11:07:47.108416');


--
-- Data for Name: guide_languages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: guide_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.guide_profiles (guide_profile_id, first_name, last_name, email, phone_number, active, created_at, updated_at) VALUES ('99e181a2-20fe-496f-b4c4-2b263ca9479a', 'Amira', 'Trabelsi', 'amira.trabelsi@dunes.local', '+216 20 111 222', true, '2026-09-21 11:07:47.169197', '2026-09-21 11:07:47.169197');
INSERT INTO public.guide_profiles (guide_profile_id, first_name, last_name, email, phone_number, active, created_at, updated_at) VALUES ('4136a0c4-31f8-4c9a-a77d-f2e477ed1d95', 'Youssef', 'Bel Haj', 'youssef.belhaj@dunes.local', '+216 20 333 444', true, '2026-09-21 11:07:47.183831', '2026-09-21 11:07:47.183831');
INSERT INTO public.guide_profiles (guide_profile_id, first_name, last_name, email, phone_number, active, created_at, updated_at) VALUES ('9b849725-c7ed-4f14-b393-1fc1300af082', 'Sami', 'Karray', 'sami.karray@dunes.local', '+216 20 555 666', true, '2026-09-21 11:07:47.199031', '2026-09-21 11:07:47.199031');


--
-- Data for Name: guide_profile_languages; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.guide_profile_languages (guide_profile_id, language_id) VALUES ('99e181a2-20fe-496f-b4c4-2b263ca9479a', 'a1000000-0000-0000-0000-000000000001');
INSERT INTO public.guide_profile_languages (guide_profile_id, language_id) VALUES ('99e181a2-20fe-496f-b4c4-2b263ca9479a', 'a1000000-0000-0000-0000-000000000002');
INSERT INTO public.guide_profile_languages (guide_profile_id, language_id) VALUES ('4136a0c4-31f8-4c9a-a77d-f2e477ed1d95', 'a1000000-0000-0000-0000-000000000003');
INSERT INTO public.guide_profile_languages (guide_profile_id, language_id) VALUES ('4136a0c4-31f8-4c9a-a77d-f2e477ed1d95', 'a1000000-0000-0000-0000-000000000001');
INSERT INTO public.guide_profile_languages (guide_profile_id, language_id) VALUES ('9b849725-c7ed-4f14-b393-1fc1300af082', 'a1000000-0000-0000-0000-000000000002');
INSERT INTO public.guide_profile_languages (guide_profile_id, language_id) VALUES ('9b849725-c7ed-4f14-b393-1fc1300af082', 'a1000000-0000-0000-0000-000000000003');


--
-- Data for Name: navigation_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.navigation_items (nav_item_id, company_type, created_at, display_order, label, locale, menu_type, updated_at, url) VALUES ('4a581b27-c4bd-4de2-88ff-a3935ce0e3cc', 'DUNES_INSOLITES', '2026-09-21 11:07:47.119001', 6, 'Circuits', 'FR', 'NONE', '2026-09-21 11:07:47.119001', '/circuits');
INSERT INTO public.navigation_items (nav_item_id, company_type, created_at, display_order, label, locale, menu_type, updated_at, url) VALUES ('c8aab012-a489-4eed-a1f8-e99aaae37e25', 'DUNES_INSOLITES', '2026-09-21 11:07:47.126468', 6, 'Circuits', 'EN', 'NONE', '2026-09-21 11:07:47.126468', '/circuits');
INSERT INTO public.navigation_items (nav_item_id, company_type, created_at, display_order, label, locale, menu_type, updated_at, url) VALUES ('c44d8c3d-a293-49bb-adc9-873fece3e4d7', 'DUNES_INSOLITES', '2026-09-21 11:07:47.133003', 6, 'Rundreisen', 'DE', 'NONE', '2026-09-21 11:07:47.133003', '/circuits');
INSERT INTO public.navigation_items (nav_item_id, company_type, created_at, display_order, label, locale, menu_type, updated_at, url) VALUES ('f9fb27f0-09ae-430d-bff6-ec2fce527fa5', 'DUNES_INSOLITES', '2026-09-21 11:07:47.139893', 6, 'Circuiti', 'IT', 'NONE', '2026-09-21 11:07:47.139893', '/circuits');
INSERT INTO public.navigation_items (nav_item_id, company_type, created_at, display_order, label, locale, menu_type, updated_at, url) VALUES ('4a9a52a9-a1ab-4162-b97f-5010949a6921', 'DUNES_INSOLITES', '2026-09-21 11:07:47.147123', 6, 'Ture', 'DA', 'NONE', '2026-09-21 11:07:47.147123', '/circuits');
INSERT INTO public.navigation_items (nav_item_id, company_type, created_at, display_order, label, locale, menu_type, updated_at, url) VALUES ('9d8974f5-f538-45f5-a40c-3ea2c4bc0158', 'DUNES_INSOLITES', '2026-09-21 11:07:47.154042', 6, 'الرحلات', 'AR', 'NONE', '2026-09-21 11:07:47.154042', '/circuits');


--
-- Data for Name: newsletter_subscribers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.newsletter_subscribers (id, email, subscribed_at, launch_email_sent_at) VALUES ('ac451fd4-34ba-4e46-86eb-2672a9c7dabe', 'dev-subscriber1@dunes.local', '2026-09-21 11:07:47.703112', NULL);
INSERT INTO public.newsletter_subscribers (id, email, subscribed_at, launch_email_sent_at) VALUES ('d7a821a9-ba9f-441e-9e60-b11a0e3b8017', 'dev-subscriber2@dunes.local', '2026-09-21 11:07:47.710399', NULL);
INSERT INTO public.newsletter_subscribers (id, email, subscribed_at, launch_email_sent_at) VALUES ('da7069fa-f49b-4030-a507-5b2be2f8587e', 'dev-subscriber3@dunes.local', '2026-09-21 11:07:47.716781', NULL);


--
-- Data for Name: participants; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sources; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sources (source_id, name) VALUES ('06cbc99d-4d51-4ca4-af6b-361ed3995b6a', 'Facebook');
INSERT INTO public.sources (source_id, name) VALUES ('67ec5dba-034b-4461-9813-31caeb8143fb', 'Instagram');
INSERT INTO public.sources (source_id, name) VALUES ('186470f5-bfdf-4f58-98f6-07ab6970a701', 'WhatsApp');
INSERT INTO public.sources (source_id, name) VALUES ('1764b3c0-94d0-4fa3-96b9-bec3469e0fbc', 'Site web');
INSERT INTO public.sources (source_id, name) VALUES ('e8bce3e2-8337-4ef0-93c8-44fce3eb2d6a', 'Bouche à oreille');


--
-- Data for Name: tours; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tours (tour_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, group_size_type, is_active, location, meeting_point, name, partner_adult_price, partner_child_price, passenger_adult_price, passenger_child_price, review_count, slug, tva) VALUES ('595546ab-0cb1-4d22-9a05-211c031df887', NULL, NULL, NULL, NULL, NULL, 'Decouvrez le charme authentique du sud tunisien avec cette excursion exceptionnelle de Djerba vers Tataouine et Chenini. Entre paysages desertiques fascinants, villages berberes perches, et sites iconiques de tournage de Star Wars, cette journee vous transporte dans un univers ou histoire et cinema se croisent.', '1 Jour', NULL, true, NULL, NULL, 'Excursion d''une Journee : Djerba Vers Tataouine et Chenini a la Decouverte du Desert Tunisien et des Lieux de Star Wars', 85.000, 45.000, 85.000, 45.000, 0, 'excursion-tataouine-chenini-desert-tunisien-star-wars', 13.000);
INSERT INTO public.tours (tour_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, group_size_type, is_active, location, meeting_point, name, partner_adult_price, partner_child_price, passenger_adult_price, passenger_child_price, review_count, slug, tva) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Evadez-vous au coeur du sud de la Tunisie lors de cette inoubliable excursion de 2 jours dans le desert du Sahara, qui combine l''histoire romaine, la culture berbere, des paysages a couper le souffle et une nuit au Dunes Insolites Desert Camp, l''un des camps sahariens les plus authentiques de Tunisie.

Jour 1 : El Jem, Matmata, camp dans le desert Dunes Insolites. Apres une prise en charge tot le matin a votre hotel de Tunis, Hammamet ou Sousse, partez vers le sud jusqu''au spectaculaire amphitheatre d''El Jem. Poursuivez jusqu''a Matmata, celebre pour ses maisons berberes troglodytes, avant de dejeuner dans un restaurant local. Rejoignez ensuite le Dunes Insolites Desert Camp pour une soiree traditionnelle et une nuit sous les etoiles du Sahara.

Jour 2 : Chott El Jerid, Chebika, Kairouan. Apres le petit-dejeuner, traversez le Chott el-Jerid puis l''oasis de montagne de Chebika, avant de rejoindre Kairouan, ville sainte classee au patrimoine mondial de l''UNESCO, puis le retour vers Tunis, Hammamet ou Sousse en debut de soiree.', NULL, true, 24, '/images/tours/tunisie-2-jours-oasis-montagne-sahara/01.avif', 'Decouvrez le Sahara tunisien en 2 jours : El Jem, Matmata, le camp Dunes Insolites Desert Camp, le Chott el-Jerid, l''oasis de Chebika et Kairouan, avec une nuit inoubliable dans le desert.', '2 Jours', NULL, true, 'Tunis', '3 points de prise en charge : Tunis Clock Tower, Tunis, ou Bab al-Bhar - retour identique', 'Tunisie : 2 jours entre oasis de montagne et camp dans le desert du Sahara', 127.000, 127.000, 127.000, 127.000, 0, 'tunisie-2-jours-oasis-montagne-sahara', 13.000);
INSERT INTO public.tours (tour_id, about_text, average_rating, free_cancellation, cancellation_hours_before_deadline, cover_photo_url, description, duration, group_size_type, is_active, location, meeting_point, name, partner_adult_price, partner_child_price, passenger_adult_price, passenger_child_price, review_count, slug, tva) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', NULL, NULL, true, 24, '/images/tours/depuis-tunis-2-jours-camp-sahara/01.avif', 'Decouvrez le desert du Sahara lors d''une aventure de 2 jours au depart de Sabria. Passez la nuit dans une tente traditionnelle, profitez d''une balade a dos de chameau et d''une aventure en quad, et savourez des repas locaux.', '2 Jours', NULL, true, 'Tunis', 'Prise en charge et retour directement a votre hotel (Tunis, Hammamet, Sousse)', 'Depuis Tunis : 2 jours tout compris dans un camp du Sahara', 192.000, 192.000, 192.000, 192.000, 0, 'depuis-tunis-2-jours-camp-sahara', 13.000);


--
-- Data for Name: tour_highlights; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_highlights (tour_id, highlight, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Ressentez le frisson de l''aventure avec des balades a dos de chameau et du quad en option', 0);
INSERT INTO public.tour_highlights (tour_id, highlight, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Explorez les oasis epoustouflantes de Chebika', 1);
INSERT INTO public.tour_highlights (tour_id, highlight, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Savourez un diner traditionnel dans le desert sous les etoiles dans un camp du Sahara', 2);
INSERT INTO public.tour_highlights (tour_id, highlight, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Visitez l''impressionnant amphitheatre romain d''El Jem, classe au patrimoine mondial de l''UNESCO', 3);
INSERT INTO public.tour_highlights (tour_id, highlight, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Decouvrez la magie du Sahara avec une vue sur le coucher de soleil depuis les dunes', 4);
INSERT INTO public.tour_highlights (tour_id, highlight, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Decouvrez le desert du Sahara lors d''une aventure de 2 jours au depart de Sabria', 0);
INSERT INTO public.tour_highlights (tour_id, highlight, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Profitez d''une balade a dos de chameau et d''une aventure en quad dans les dunes du Sahara', 1);
INSERT INTO public.tour_highlights (tour_id, highlight, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Passez la nuit dans une tente traditionnelle du Sahara et profitez de l''hospitalite locale', 2);
INSERT INTO public.tour_highlights (tour_id, highlight, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Savourez un diner traditionnel et un petit-dejeuner dans le camp du desert', 3);


--
-- Data for Name: tour_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Transport climatise', 0);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Nuit au camp Dunes Insolites', 1);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', '2 dejeuners', 2);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Diner et petit-dejeuner au camp', 3);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Assistance locale au camp', 4);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Prise en charge et retour directement a votre hotel', 0);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Transport en vehicule confortable et climatise pendant les 2 jours', 1);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Chauffeur / accompagnement pendant le circuit', 2);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', '1 nuit dans une tente authentique au Camp Dunes Insolites', 3);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Balade de 30 minutes a dos de chameau', 4);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Balade de 30 minutes en quad', 5);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Sandboard', 6);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Divertissement folklorique traditionnel', 7);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Spectacle equestre', 8);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Demonstration de pain de sable', 9);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Dejeuner le 1er jour', 10);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Diner traditionnel au camp', 11);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Petit-dejeuner et dejeuner le jour 2', 12);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Visites mentionnees dans l''itineraire', 13);
INSERT INTO public.tour_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Organisation complete et assistance pendant toute l''excursion', 14);


--
-- Data for Name: tour_languages; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_languages (tour_id, language_id) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'a1000000-0000-0000-0000-000000000002');
INSERT INTO public.tour_languages (tour_id, language_id) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'a1000000-0000-0000-0000-000000000001');
INSERT INTO public.tour_languages (tour_id, language_id) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'a1000000-0000-0000-0000-000000000003');
INSERT INTO public.tour_languages (tour_id, language_id) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'a1000000-0000-0000-0000-000000000001');
INSERT INTO public.tour_languages (tour_id, language_id) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'a1000000-0000-0000-0000-000000000002');


--
-- Data for Name: tour_not_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_not_included_items (tour_id, item, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Activites supplementaires en option', 0);
INSERT INTO public.tour_not_included_items (tour_id, item, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Pourboires', 1);
INSERT INTO public.tour_not_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Boissons en dehors des repas inclus', 0);
INSERT INTO public.tour_not_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Depenses personnelles', 1);
INSERT INTO public.tour_not_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Pourboires', 2);
INSERT INTO public.tour_not_included_items (tour_id, item, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Toute activite supplementaire non mentionnee dans les services inclus', 3);


--
-- Data for Name: tour_photos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', NULL, '/images/tours/tunisie-2-jours-oasis-montagne-sahara/01.avif', 0);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', NULL, '/images/tours/tunisie-2-jours-oasis-montagne-sahara/02.avif', 1);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', NULL, '/images/tours/tunisie-2-jours-oasis-montagne-sahara/03.avif', 2);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', NULL, '/images/tours/tunisie-2-jours-oasis-montagne-sahara/04.avif', 3);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', NULL, '/images/tours/tunisie-2-jours-oasis-montagne-sahara/05.avif', 4);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', NULL, '/images/tours/depuis-tunis-2-jours-camp-sahara/01.avif', 0);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', NULL, '/images/tours/depuis-tunis-2-jours-camp-sahara/02.avif', 1);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', NULL, '/images/tours/depuis-tunis-2-jours-camp-sahara/03.avif', 2);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', NULL, '/images/tours/depuis-tunis-2-jours-camp-sahara/04.avif', 3);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', NULL, '/images/tours/depuis-tunis-2-jours-camp-sahara/05.avif', 4);
INSERT INTO public.tour_photos (tour_id, caption, url, display_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', NULL, '/images/tours/depuis-tunis-2-jours-camp-sahara/06.avif', 5);


--
-- Data for Name: tour_program_steps; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', '3 points de prise en charge possibles - retour identique en fin de circuit.', 'Prise en charge', 'Tunis Clock Tower, Tunis ou Bab al-Bhar', 0);
INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Pause photos, visite guidee, temps libre. Site classe au patrimoine mondial de l''UNESCO, l''une des plus grandes arenes romaines au monde.', 'Bus ou car - 2h', 'Amphitheatre d''El Jem', 1);
INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Visite d''une maison berbere troglodyte (lieu de tournage Star Wars), dejeuner dans un restaurant local.', 'Bus ou car - 2h', 'Matmata', 2);
INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Installation en tente berbere privee, the a la menthe au coucher du soleil, demonstration du pain Mella cuit sous le sable, diner tunisien, divertissement folklorique et nuit sous les etoiles du Sahara. Activites optionnelles : balade a dos de chameau, quad, 4x4, sandboard.', 'Bus ou car - 2h', 'Camp Dunes Insolites', 3);
INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Visite et temps libre - le plus grand lac sale d''Afrique du Nord.', 'Bus ou car - 2h', 'Chott el Djerid', 4);
INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Visite et dejeuner - palmeraies, sources naturelles et canyons de l''oasis de montagne.', 'Bus ou car - 1h', 'Oasis de Chebika', 5);
INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Visite - l''une des villes les plus sacrees de l''islam, site classe au patrimoine mondial de l''UNESCO.', 'Bus ou car - 2h', 'Kairouan', 6);
INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('9a01dc96-ce5b-4795-b0f6-c94242126988', 'Arrivee en debut de soiree, avec des souvenirs inoubliables de l''aventure dans le desert du Sahara.', 'Retour', 'Tunis, Hammamet ou Sousse', 7);
INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Prise en charge a l''hotel, route vers le sud avec arrets, arrivee et nuit au camp Dunes Insolites.', 'Jour 1', 'Nord de la Tunisie, El Jem, Matmata, Douz, camp dans le Sahara', 0);
INSERT INTO public.tour_program_steps (tour_id, description, label, title, step_order) VALUES ('1df72d25-2163-4607-b9bc-b339af7975c7', 'Depart du camp, traversee du Chott Jerid et de l''oasis de Chebika, halte a Kairouan, puis retour a l''hotel.', 'Jour 2', 'Sabria, Kebili, Chott Jerid, Chebika, Kairouan, retour', 1);


--
-- Data for Name: tour_translations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tour_translation_highlights; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tour_translation_included_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tour_translation_not_included_items; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tour_translation_program_steps; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tour_type_highlights; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tour_type_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_type_included_items (tour_type_id, item, display_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Tente en toile privée pour la nuit', 0);
INSERT INTO public.tour_type_included_items (tour_type_id, item, display_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Dîner et petit-déjeuner', 1);
INSERT INTO public.tour_type_included_items (tour_type_id, item, display_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Feu de camp et thé à la menthe', 2);
INSERT INTO public.tour_type_included_items (tour_type_id, item, display_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Transfert retour depuis Douz ou Kébili', 3);


--
-- Data for Name: tour_type_languages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tour_type_not_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_type_not_included_items (tour_type_id, item, display_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Activités (chameau, quad, surf des dunes — à ajouter ci-dessous)', 0);
INSERT INTO public.tour_type_not_included_items (tour_type_id, item, display_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Pourboires', 1);
INSERT INTO public.tour_type_not_included_items (tour_type_id, item, display_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Assurance voyage', 2);


--
-- Data for Name: tour_type_photos; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_type_photos (tour_type_id, caption, url, display_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', NULL, '/images/under-hero.jpg', 0);
INSERT INTO public.tour_type_photos (tour_type_id, caption, url, display_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', NULL, '/images/gate.jpg', 1);


--
-- Data for Name: tour_type_program_steps; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_type_program_steps (tour_type_id, description, label, title, step_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Rencontrez l''équipe, installez-vous dans votre tente traditionnelle, et savourez le calme des dunes.', '15:00', 'Bienvenue au campement', 0);
INSERT INTO public.tour_type_program_steps (tour_type_id, description, label, title, step_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Choisissez en option une balade à dos de chameau, une sortie en 4x4 ou en quad, ou une session de surf des dunes avant le coucher du soleil.', 'Fin d''après-midi', 'Faites du désert votre terrain de jeu', 1);
INSERT INTO public.tour_type_program_steps (tour_type_id, description, label, title, step_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Regardez le ciel du Sahara devenir cuivré autour d''un thé à la menthe et d''une démonstration de pain cuit sous le sable.', 'Coucher du soleil', 'Thé, couleurs et pain de sable', 2);
INSERT INTO public.tour_type_program_steps (tour_type_id, description, label, title, step_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Partagez harira, salade tunisienne, brik, viande cuite au feu et douceurs locales avant de vous réunir autour du feu de camp.', 'Soirée', 'Dîner et musique sous les étoiles', 3);
INSERT INTO public.tour_type_program_steps (tour_type_id, description, label, title, step_order) VALUES ('7359b02c-7db9-4565-9d92-b2d24f75b584', 'Dormez profondément sous votre tente, puis commencez la journée par un petit-déjeuner tranquille et les premières lueurs sur le sable.', 'Matin', 'Réveil parmi les dunes', 4);


--
-- Data for Name: tour_type_translations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('bed12ca2-e3fe-4641-960e-ba64fa63523f', NULL, 'No walls, no electricity — a rustic camp set up fresh each evening on a high dune, mattresses under the stars or a simple tent if the wind picks up.', 'EN', 'Bivouac Under the Stars', 'c7434387-2006-404e-9913-0686586e4943');
INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('9e267330-8247-4f08-baed-1b9d00838274', NULL, 'Niente pareti, niente elettricità — un campo rustico allestito ogni sera su una duna alta, materassi sotto le stelle o una tenda semplice se si alza il vento.', 'IT', 'Bivacco sotto le stelle', 'c7434387-2006-404e-9913-0686586e4943');
INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('aa7d0bfc-4537-492b-b9eb-a2cf24de1830', NULL, 'Ingen vægge, ingen elektricitet — en rustik lejr, der sættes op på ny hver aften på en høj klit, madrasser under stjernerne eller et enkelt telt, hvis vinden tager til.', 'DA', 'Bivuak under stjernerne', 'c7434387-2006-404e-9913-0686586e4943');
INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('bbc2b78d-3b3e-4c20-9a59-962c8bc9d337', NULL, 'لا جدران، لا كهرباء — مخيم بسيط يُنصب من جديد كل مساء على كثيب مرتفع، مراتب تحت النجوم أو خيمة بسيطة إن اشتدت الرياح.', 'AR', 'مبيت تحت النجوم', 'c7434387-2006-404e-9913-0686586e4943');
INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('afbe747c-169e-429b-bad4-6a63949223de', NULL, 'Keine Wände, kein Strom — ein rustikales Lager, das jeden Abend frisch auf einer hohen Düne aufgebaut wird, Matratzen unter den Sternen oder ein einfaches Zelt, falls der Wind auffrischt.', 'DE', 'Biwak unter den Sternen', 'c7434387-2006-404e-9913-0686586e4943');
INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Set in the quiet of the Tunisian Sahara, Dunes Insolites is a place to slow down. Arrive while the dunes are glowing, settle into your tent, and leave the noise of everyday life behind.

After dinner the fire stays lit long past dark. Most guests just sit with it — there''s no schedule for the evening beyond that.

Your tent is prepared for comfort with quality bedding and soft light. Wake with the desert, enjoy breakfast, and take your time before heading back.', 'A full night at the Sabria camp — dinner under the stars, a real bed in a canvas tent, and the dunes right outside the door.', 'EN', 'A Night at Dunes Insolites', '7359b02c-7db9-4565-9d92-b2d24f75b584');
INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Eingebettet in die Stille der tunesischen Sahara ist Dunes Insolites ein Ort zum Entschleunigen. Kommen Sie an, während die Dünen glühen, richten Sie sich in Ihrem Zelt ein und lassen Sie den Lärm des Alltags hinter sich.

Nach dem Abendessen bleibt das Feuer lange nach Einbruch der Dunkelheit brennen. Die meisten Gäste sitzen einfach dabei — für den Abend gibt es darüber hinaus keinen Zeitplan.

Ihr Zelt ist mit hochwertiger Bettwäsche und sanftem Licht für Komfort vorbereitet. Wachen Sie mit der Wüste auf, genießen Sie das Frühstück und lassen Sie sich Zeit, bevor Sie zurückfahren.', 'Eine vollständige Nacht im Lager von Sabria — Abendessen unter den Sternen, ein richtiges Bett in einem Segeltuchzelt, und die Dünen direkt vor der Tür.', 'DE', 'Eine Nacht bei Dunes Insolites', '7359b02c-7db9-4565-9d92-b2d24f75b584');
INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Immerso nella quiete del Sahara tunisino, Dunes Insolites è un luogo dove rallentare. Arrivate mentre le dune si illuminano, sistematevi nella vostra tenda e lasciatevi alle spalle il rumore della vita quotidiana.

Dopo cena il fuoco resta acceso ben oltre il buio. La maggior parte degli ospiti si limita a sedersi accanto ad esso — non c''è un programma per la serata al di là di questo.

La vostra tenda è allestita per il comfort con biancheria di qualità e luce soffusa. Svegliatevi con il deserto, godetevi la colazione e prendetevi il vostro tempo prima di ripartire.', 'Una notte intera all''accampamento di Sabria — cena sotto le stelle, un vero letto in una tenda di tela, e le dune proprio fuori dalla porta.', 'IT', 'Una notte a Dunes Insolites', '7359b02c-7db9-4565-9d92-b2d24f75b584');
INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Dunes Insolites ligger i den tunesiske Saharas stilhed og er et sted at sænke tempoet. Ankom mens klitterne gløder, slå dig ned i dit telt, og læg hverdagens støj bag dig.

Efter aftensmaden holdes bålet tændt langt ud på natten. De fleste gæster sidder bare ved det — der er ikke noget program for aftenen ud over det.

Dit telt er indrettet til komfort med kvalitetssengetøj og blødt lys. Vågn op med ørkenen, nyd morgenmaden, og tag dig god tid, før du tager tilbage.', 'En hel nat i Sabria-lejren — middag under stjernerne, en rigtig seng i et lærredstelt, og klitterne lige uden for døren.', 'DA', 'En nat hos Dunes Insolites', '7359b02c-7db9-4565-9d92-b2d24f75b584');
INSERT INTO public.tour_type_translations (tour_type_translation_id, about_text, description, locale, name, tour_type_id) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'يقع دون إنسوليت في هدوء الصحراء التونسية، وهو مكان للتباطؤ. اصلوا بينما تتوهج الكثبان، استقروا في خيمتكم، واتركوا ضجيج الحياة اليومية خلفكم.

بعد العشاء تبقى النار مشتعلة لفترة طويلة بعد حلول الظلام. يكتفي معظم الضيوف بالجلوس حولها — لا يوجد برنامج محدد للمساء بعد ذلك.

خيمتكم مُعدة براحة تامة بفراش عالي الجودة وإضاءة هادئة. استيقظوا مع الصحراء، استمتعوا بالإفطار، وخذوا وقتكم قبل العودة.', 'ليلة كاملة في مخيم سابرية — عشاء تحت النجوم، سرير حقيقي في خيمة من القماش، والكثبان مباشرة عند الباب.', 'AR', 'ليلة في دون إنسوليت', '7359b02c-7db9-4565-9d92-b2d24f75b584');


--
-- Data for Name: tour_type_translation_highlights; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: tour_type_translation_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Private canvas tent for the night', 0);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Dinner and breakfast', 1);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Campfire and mint tea', 2);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Return transfer from Douz or Kebili', 3);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Privates Segeltuchzelt für die Nacht', 0);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Abendessen und Frühstück', 1);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Lagerfeuer und Minztee', 2);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Rücktransfer von Douz oder Kebili', 3);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Tenda di tela privata per la notte', 0);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Cena e colazione', 1);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Fuoco da campo e tè alla menta', 2);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Transfer di ritorno da Douz o Kebili', 3);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Privat lærredstelt for natten', 0);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Aftensmad og morgenmad', 1);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Lejrbål og mynteté', 2);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Returtransport fra Douz eller Kebili', 3);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'خيمة قماشية خاصة لليلة', 0);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'العشاء والإفطار', 1);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'نار المخيم وشاي بالنعناع', 2);
INSERT INTO public.tour_type_translation_included_items (tour_type_translation_id, item, display_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'النقل عودة من دوز أو قبلي', 3);


--
-- Data for Name: tour_type_translation_not_included_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Activities (camel, quad, sandboarding — add below)', 0);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Gratuities', 1);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Travel insurance', 2);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Aktivitäten (Kamel, Quad, Sandboarding — unten hinzufügen)', 0);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Trinkgelder', 1);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Reiseversicherung', 2);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Attività (cammello, quad, sandboarding — da aggiungere qui sotto)', 0);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Mance', 1);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Assicurazione di viaggio', 2);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Aktiviteter (kamel, quad, sandboarding — tilføjes nedenfor)', 0);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Drikkepenge', 1);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Rejseforsikring', 2);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'الأنشطة (جمل، دراجة رباعية، تزلج على الرمال — تُضاف أدناه)', 0);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'الإكراميات', 1);
INSERT INTO public.tour_type_translation_not_included_items (tour_type_translation_id, item, display_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'التأمين على السفر', 2);


--
-- Data for Name: tour_type_translation_program_steps; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Meet the team, settle into your traditional tent, and take in the quiet of the dunes.', '15:00', 'Welcome to the camp', 0);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Choose an optional camel ride, 4x4 or quad outing, or sandboarding session before sunset.', 'Late afternoon', 'Make the desert your playground', 1);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Watch the sky turn copper over the Sahara with mint tea and a demonstration of bread baked beneath the sand.', 'Sunset', 'Tea, colour, and sand bread', 2);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Share harira, Tunisian salad, brik, fire-cooked meat, and local sweets before gathering around the campfire.', 'Evening', 'Dinner and music under the stars', 3);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('d034ed53-037c-49ae-9365-3ca40cfa92be', 'Sleep deeply in your tent, then begin the day with a relaxed breakfast and the first light over the sand.', 'Morning', 'Wake with the dunes', 4);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Lernen Sie das Team kennen, richten Sie sich in Ihrem traditionellen Zelt ein und genießen Sie die Stille der Dünen.', '15:00', 'Willkommen im Lager', 0);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Wählen Sie optional einen Kamelritt, eine 4x4- oder Quad-Tour oder eine Sandboarding-Session vor Sonnenuntergang.', 'Später Nachmittag', 'Machen Sie die Wüste zu Ihrem Spielplatz', 1);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Beobachten Sie, wie sich der Himmel über der Sahara kupferfarben färbt, bei Minztee und einer Vorführung von im Sand gebackenem Brot.', 'Sonnenuntergang', 'Tee, Farben und Sandbrot', 2);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Genießen Sie Harira, tunesischen Salat, Brik, am Feuer gegartes Fleisch und lokale Süßigkeiten, bevor Sie sich um das Lagerfeuer versammeln.', 'Abend', 'Abendessen und Musik unter den Sternen', 3);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('1c805d07-867a-4ae0-9f7e-d80724211684', 'Schlafen Sie tief in Ihrem Zelt, beginnen Sie den Tag dann mit einem entspannten Frühstück und dem ersten Licht über dem Sand.', 'Morgen', 'Aufwachen mit den Dünen', 4);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Incontrate il team, sistematevi nella vostra tenda tradizionale e godetevi la quiete delle dune.', '15:00', 'Benvenuti all''accampamento', 0);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Scegliete facoltativamente un giro in cammello, un''uscita in 4x4 o in quad, oppure una sessione di sandboarding prima del tramonto.', 'Tardo pomeriggio', 'Fate del deserto il vostro parco giochi', 1);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Guardate il cielo del Sahara diventare color rame con un tè alla menta e una dimostrazione di pane cotto sotto la sabbia.', 'Tramonto', 'Tè, colori e pane di sabbia', 2);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Condividete harira, insalata tunisina, brik, carne cotta sul fuoco e dolci locali prima di riunirvi intorno al fuoco da campo.', 'Sera', 'Cena e musica sotto le stelle', 3);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('4d311b6d-a559-4f0e-b7bf-990842d34a5d', 'Dormite profondamente nella vostra tenda, poi iniziate la giornata con una colazione rilassata e la prima luce sulla sabbia.', 'Mattina', 'Svegliarsi tra le dune', 4);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Mød teamet, slå dig ned i dit traditionelle telt, og nyd klitternes stilhed.', '15:00', 'Velkommen til lejren', 0);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Vælg eventuelt en kameltur, en 4x4- eller quadtur, eller en sandboarding-session inden solnedgang.', 'Sen eftermiddag', 'Gør ørkenen til din legeplads', 1);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Se himlen over Sahara blive kobberfarvet under en kop mynteté og en demonstration af brød bagt under sandet.', 'Solnedgang', 'Te, farver og sandbrød', 2);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Del harira, tunesisk salat, brik, bålstegt kød og lokale sødsager, før I samles omkring lejrbålet.', 'Aften', 'Middag og musik under stjernerne', 3);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('c673b6df-ca4b-4b84-8ba3-02d3842aa30f', 'Sov dybt i dit telt, og start dagen med en afslappet morgenmad og det første lys over sandet.', 'Morgen', 'Vågn op med klitterne', 4);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'تعرفوا على الفريق، استقروا في خيمتكم التقليدية، واستمتعوا بهدوء الكثبان.', '15:00', 'الترحيب بكم في المخيم', 0);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'اختاروا كخيار إضافي رحلة على ظهر الجمل، أو جولة بسيارة دفع رباعي أو دراجة رباعية، أو جلسة تزلج على الرمال قبل الغروب.', 'أواخر بعد الظهر', 'اجعلوا الصحراء ملعبكم', 1);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'شاهدوا سماء الصحراء تتحول إلى اللون النحاسي مع شاي بالنعناع وعرض لخبز يُخبز تحت الرمل.', 'الغروب', 'شاي وألوان وخبز الرمل', 2);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'شاركوا الحريرة والسلطة التونسية والبريك واللحم المشوي على النار والحلويات المحلية قبل التجمع حول نار المخيم.', 'المساء', 'عشاء وموسيقى تحت النجوم', 3);
INSERT INTO public.tour_type_translation_program_steps (tour_type_translation_id, description, label, title, step_order) VALUES ('a0e97ea1-781c-479c-8a04-929b38f459fd', 'ناموا بعمق في خيمتكم، ثم ابدأوا اليوم بإفطار هادئ وأولى أشعة الضوء فوق الرمال.', 'الصباح', 'الاستيقاظ مع الكثبان', 4);
