-- V39__payment_policy.sql
-- The rules for taking payment, editable from the backoffice instead of
-- being hardcoded. Until now the upfront amount was a literal 10% in
-- ReservationServiceImpl and the payment email always asked for an online
-- deposit. Single row (id always 1), same shape as site_settings.
--
-- deposit_mode   NONE    no upfront amount, pay on arrival
--                PERCENT deposit_percent % of the total, due before arrival
--                FULL    the whole total, due before arrival
-- deadline_days_before: days before arrival the deposit is due; NULL = the
--                arrival date itself (what the old email said).
CREATE TABLE payment_policy (
    id bigint NOT NULL,
    deposit_mode character varying(16) NOT NULL,
    deposit_percent numeric(5,2) NOT NULL,
    deadline_days_before integer,
    accept_online_link boolean NOT NULL,
    accept_bank_transfer boolean NOT NULL,
    accept_card_on_site boolean NOT NULL,
    accept_cash_on_site boolean NOT NULL,
    accept_cheque boolean NOT NULL,
    note character varying(1000),
    updated_at timestamp(6) without time zone,
    CONSTRAINT payment_policy_pkey PRIMARY KEY (id),
    CONSTRAINT payment_policy_mode_chk CHECK (deposit_mode IN ('NONE', 'PERCENT', 'FULL')),
    CONSTRAINT payment_policy_percent_chk CHECK (deposit_percent >= 0 AND deposit_percent <= 100)
);

-- Seeded to today's behaviour: 10% deposit, due by arrival, paid through the
-- link the admin sends. Cash / card on site are also accepted for the rest.
INSERT INTO payment_policy (id, deposit_mode, deposit_percent, deadline_days_before,
                            accept_online_link, accept_bank_transfer, accept_card_on_site,
                            accept_cash_on_site, accept_cheque, note, updated_at)
VALUES (1, 'PERCENT', 10.00, NULL, true, true, true, true, false, NULL, now());
