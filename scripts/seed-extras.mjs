#!/usr/bin/env node
// Populates the Extras collection with the site's 6 real on-site add-ons —
// transferred directly from frontend/lib/data/activities-i18n/*.ts (the
// real, already-published, already-translated content every activity page
// on the live site renders from), not re-typed or invented. Imports the
// real TS modules rather than hand-copying their content into this script,
// so there is no transcription step that could drift from the source.
//
// French (activitiesFr) is the base row on Extra itself; the other 5
// locales become ExtraTranslation rows in the same create request — see
// backend/.../dto/CatalogTranslationDto.java. `included`/`notIncluded` map
// onto includedItems/notIncludedItems; `longDescription` joins into
// aboutText. Fields with no real source (groupSizeType, languages,
// cancellationPolicy, photos) are left unset rather than guessed at.
//
// TVA 13% matches the one Extra already seeded in this database
// (Seed.java's "30 min Quad", real data already there) — not invented.
//
// Run once against the real running backend. Not idempotent — Extra.slug
// is unique, so a second run 409s on every row (logged, not fatal).
//
//   node scripts/seed-extras.mjs

const BACKEND = "http://127.0.0.1:8099/api";
const LOCALES = ["en", "de", "it", "da", "ar"]; // ContentLocale enum — no FR, that's the base
const LOCALE_ENUM = { en: "EN", de: "DE", it: "IT", da: "DA", ar: "AR" };

async function req(method, path, token, body) {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data };
}

async function login() {
  const { status, data } = await req("POST", "/auth/login", null, {
    email: process.env.SEED_ADMIN_EMAIL ?? "testadmin@dunes.local",
    password: process.env.SEED_ADMIN_PASSWORD ?? "AdminPass1!",
  });
  if (status !== 200) throw new Error(`login failed: ${status} ${JSON.stringify(data)}`);
  return data.accessToken;
}

function durationLabel(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h${m}`;
}

async function loadLocale(mod, exportName) {
  const m = await import(`../frontend/lib/data/activities-i18n/${mod}.ts`);
  return m[exportName];
}

async function main() {
  const token = await login();

  const fr = await loadLocale("fr", "activitiesFr");
  const byLocale = {
    en: await loadLocale("en", "activitiesEn"),
    de: await loadLocale("de", "activitiesDe"),
    it: await loadLocale("it", "activitiesIt"),
    da: await loadLocale("da", "activitiesDa"),
    ar: await loadLocale("ar", "activitiesAr"),
  };

  let created = 0;
  let skipped = 0;

  for (const activity of fr) {
    const translations = LOCALES.map((loc) => {
      const t = byLocale[loc].find((a) => a.slug === activity.slug);
      return {
        locale: LOCALE_ENUM[loc],
        name: t.title,
        description: t.description,
        aboutText: t.longDescription.join("\n\n"),
        includedItems: t.included,
        notIncludedItems: t.notIncluded,
      };
    });

    const body = {
      name: activity.title,
      slug: activity.slug,
      description: activity.description,
      duration: durationLabel(activity.durationMins),
      unitPrice: activity.priceFrom,
      isActive: true,
      tva: 13,
      aboutText: activity.longDescription.join("\n\n"),
      includedItems: activity.included,
      notIncludedItems: activity.notIncluded,
      meetingPoint: activity.meetingPoint,
      location: "Sabria",
      coverPhotoUrl: activity.heroImage,
      translations,
    };

    const { status, data } = await req("POST", "/extras", token, body);
    if (status === 201) {
      created++;
      console.log(`created  ${activity.slug} -> ${activity.title} (${activity.priceFrom} TND)`);
    } else {
      skipped++;
      console.log(`skipped  ${activity.slug}  (${status}: ${JSON.stringify(data)})`);
    }
  }

  console.log(`\n${created} created, ${skipped} skipped (of ${fr.length} total).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
