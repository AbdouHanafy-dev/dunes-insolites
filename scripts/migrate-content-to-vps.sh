#!/usr/bin/env bash
# One-time content migration: copies the 5 missing activities (extras) and
# 1 missing stay (tour_type) — plus their translations, included/not-included
# items, photos, and program steps — from the local dev database to the VPS.
#
# Additive only: never deletes, never touches existing VPS rows. quad-desert
# and bivouac-desert-tunisie (already on the VPS, seeded independently there)
# are explicitly excluded by slug, so there is no duplicate-row risk.
#
# Prerequisite: the local `duneinsolite-postgres` container running (it is,
# as of this session) and SSH access to the VPS (~/.ssh/dunes_vps_ed25519).
#
# Run this yourself: the action writes to a shared/production resource, which
# this environment's own safety classifier correctly requires a human to run.
set -euo pipefail

VPS="root@79.143.185.33"
KEY="$HOME/.ssh/dunes_vps_ed25519"
LOCAL_DB="docker exec duneinsolite-postgres psql -U postgres -d duneinsolite"
VPS_PSQL="docker exec -i dunes-v2-postgres psql -U postgres -d duneinsolite"

migrate() {
  local table="$1" select_sql="$2"
  echo "==> $table"
  $LOCAL_DB -c "COPY ($select_sql) TO STDOUT" \
    | ssh -i "$KEY" -o BatchMode=yes "$VPS" "$VPS_PSQL -c \"COPY $table FROM STDIN\""
}

# ---- extras (activities) — parents first, then children ----
migrate extras \
  "SELECT * FROM extras WHERE slug != 'quad-desert'"

migrate extra_included_items \
  "SELECT eii.* FROM extra_included_items eii JOIN extras e ON eii.extra_id=e.extra_id WHERE e.slug != 'quad-desert'"

migrate extra_not_included_items \
  "SELECT eni.* FROM extra_not_included_items eni JOIN extras e ON eni.extra_id=e.extra_id WHERE e.slug != 'quad-desert'"

migrate extra_translations \
  "SELECT et.* FROM extra_translations et JOIN extras e ON et.extra_id=e.extra_id WHERE e.slug != 'quad-desert'"

migrate extra_translation_included_items \
  "SELECT x.* FROM extra_translation_included_items x JOIN extra_translations et ON x.extra_translation_id=et.extra_translation_id JOIN extras e ON et.extra_id=e.extra_id WHERE e.slug != 'quad-desert'"

migrate extra_translation_not_included_items \
  "SELECT x.* FROM extra_translation_not_included_items x JOIN extra_translations et ON x.extra_translation_id=et.extra_translation_id JOIN extras e ON et.extra_id=e.extra_id WHERE e.slug != 'quad-desert'"

# ---- tour_types (stays) — parent first, then children ----
migrate tour_types \
  "SELECT * FROM tour_types WHERE slug = 'nuitee-campement-desert'"

migrate tour_type_included_items \
  "SELECT tii.* FROM tour_type_included_items tii JOIN tour_types t ON tii.tour_type_id=t.tour_type_id WHERE t.slug = 'nuitee-campement-desert'"

migrate tour_type_not_included_items \
  "SELECT tni.* FROM tour_type_not_included_items tni JOIN tour_types t ON tni.tour_type_id=t.tour_type_id WHERE t.slug = 'nuitee-campement-desert'"

migrate tour_type_photos \
  "SELECT tp.* FROM tour_type_photos tp JOIN tour_types t ON tp.tour_type_id=t.tour_type_id WHERE t.slug = 'nuitee-campement-desert'"

migrate tour_type_program_steps \
  "SELECT tps.* FROM tour_type_program_steps tps JOIN tour_types t ON tps.tour_type_id=t.tour_type_id WHERE t.slug = 'nuitee-campement-desert'"

migrate tour_type_translations \
  "SELECT tt.* FROM tour_type_translations tt JOIN tour_types t ON tt.tour_type_id=t.tour_type_id WHERE t.slug = 'nuitee-campement-desert'"

migrate tour_type_translation_included_items \
  "SELECT x.* FROM tour_type_translation_included_items x JOIN tour_type_translations tt ON x.tour_type_translation_id=tt.tour_type_translation_id JOIN tour_types t ON tt.tour_type_id=t.tour_type_id WHERE t.slug = 'nuitee-campement-desert'"

migrate tour_type_translation_not_included_items \
  "SELECT x.* FROM tour_type_translation_not_included_items x JOIN tour_type_translations tt ON x.tour_type_translation_id=tt.tour_type_translation_id JOIN tour_types t ON tt.tour_type_id=t.tour_type_id WHERE t.slug = 'nuitee-campement-desert'"

migrate tour_type_translation_program_steps \
  "SELECT x.* FROM tour_type_translation_program_steps x JOIN tour_type_translations tt ON x.tour_type_translation_id=tt.tour_type_translation_id JOIN tour_types t ON tt.tour_type_id=t.tour_type_id WHERE t.slug = 'nuitee-campement-desert'"

echo "==> done. Verifying on the VPS:"
ssh -i "$KEY" -o BatchMode=yes "$VPS" "docker exec dunes-v2-postgres psql -U postgres -d duneinsolite -c \"SELECT slug, name FROM extras;\" -c \"SELECT slug, name FROM tour_types;\""
