-- Total units of one activity (quad, camel ride...) available per day - the
-- ceiling ExtraAvailabilityService.allocate() enforces under a row lock.
-- NULL = not configured, no ceiling enforced (same convention as
-- accommodation_types.max_units) - Sandboarding stays NULL, it has no
-- commercial capacity limit. No values seeded - an admin sets the real
-- numbers, nothing here invents one.
ALTER TABLE extras ADD COLUMN max_units_per_day integer;
