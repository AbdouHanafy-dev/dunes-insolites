-- Manual order of the media library (drag and drop in the backoffice picker).
-- Existing files keep today's "newest first" order; new uploads default to 0
-- so they still land at the top until someone drags them elsewhere.
ALTER TABLE media_assets
    ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE media_assets m
SET sort_order = r.rn
FROM (SELECT asset_id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn FROM media_assets) r
WHERE m.asset_id = r.asset_id;
