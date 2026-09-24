-- Timed activities. The unit price is the price of ONE base duration (30 min by
-- default); a longer session costs unit_price x (minutes / base). The step and
-- the maximum are what the guest can pick on the site. max = base means the
-- guest cannot extend it, so nothing changes until an admin raises the maximum.
ALTER TABLE extras
    ADD COLUMN base_duration_minutes INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN duration_step_minutes INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN max_duration_minutes  INTEGER NOT NULL DEFAULT 30;

-- Carry over the old free-text duration ("1h30", "2h", "30 minute") where it is readable.
UPDATE extras
SET base_duration_minutes = GREATEST(5,
        COALESCE(substring(lower(duration) from '(\d+)\s*h')::int, 0) * 60
      + COALESCE(substring(lower(duration) from 'h\s*(\d+)')::int, 0))
WHERE duration ~* '\d+\s*h';

UPDATE extras
SET base_duration_minutes = GREATEST(5, substring(lower(duration) from '(\d+)\s*min')::int)
WHERE duration ~* '\d+\s*min' AND duration !~* '\d+\s*h';

UPDATE extras SET max_duration_minutes = base_duration_minutes;

ALTER TABLE extras
    ADD CONSTRAINT extras_duration_positive
        CHECK (base_duration_minutes > 0 AND duration_step_minutes > 0
               AND max_duration_minutes >= base_duration_minutes);

-- What the guest picked, kept on the booking line (unit_price already holds the
-- price for that duration, so unit_price x quantity stays the line total).
ALTER TABLE reservation_extras ADD COLUMN duration_minutes INTEGER;
