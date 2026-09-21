#!/usr/bin/env node
// Populates the TourTypes collection with the site's 2 real nuitées —
// transferred from frontend/lib/data/stays-i18n/*.ts (the real,
// already-published content the /camp pages render from), same pattern as
// scripts/seed-extras.mjs: imports the real TS modules directly rather
// than re-typing their content.
//
// KNOWN GAP, confirmed with the user before writing any price (29 Aug
// 2026): the frontend Stay model has exactly one price per nuitée
// (priceFrom) — no adult/child split, no partner rate. TourType requires
// all four (passengerAdultPrice, passengerChildPrice, partnerAdultPrice,
// partnerChildPrice), non-null. Rather than invent a discount percentage
// that doesn't exist anywhere in the real business data, all four are set
// equal to the one real priceFrom. This is a placeholder standing in for
// real numbers, not a business decision — an admin must correct the
// child/partner rates via /catalogue/hebergements once those are known.
// Every row created this way is logged below so they're easy to find.
//
// Note what does NOT transfer, and why: Stay.accommodations (Desert Tent/
// Desert Room/Dune Suite) has no backend entity at all — confirmed while
// building Disponibilités earlier this session (see docs/cms.md) — so
// nothing here invents one; only the nuitée itself is created.
// arrivalTime/departureTime/groupSize/practicalInfo have no TourType
// column to hold them and are left out rather than stuffed into a
// mismatched field.
//
// Run once against the real running backend. Not idempotent — TourType
// .slug is unique, a second run 409s on every row (logged, not fatal).
//
//   node scripts/seed-tourtypes.mjs

// Hardcoded, deliberately not overridable via env var — this script writes
// catalog data via the admin API, and a stray BACKEND env var left set from
// another session could silently target a remote environment instead of
// this machine's own local backend.
const BACKEND = "http://127.0.0.1:8080/api";
const LOCALES = ["en", "de", "it", "da", "ar"];
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

async function loadLocale(mod, exportName) {
  const m = await import(`../frontend/lib/data/stays-i18n/${mod}.ts`);
  return m[exportName];
}

function programSteps(itinerary) {
  return itinerary.map((step) => ({
    label: step.time,
    title: step.title,
    description: step.description,
  }));
}

function photos(gallery) {
  return gallery.map((url) => ({ url, caption: null }));
}

async function main() {
  const token = await login();

  const fr = await loadLocale("fr", "staysFr");
  const byLocale = {
    en: await loadLocale("en", "staysEn"),
    de: await loadLocale("de", "staysDe"),
    it: await loadLocale("it", "staysIt"),
    da: await loadLocale("da", "staysDa"),
    ar: await loadLocale("ar", "staysAr"),
  };

  let created = 0;
  let skipped = 0;

  for (const stay of fr) {
    const translations = LOCALES.map((loc) => {
      const t = byLocale[loc].find((s) => s.slug === stay.slug);
      return {
        locale: LOCALE_ENUM[loc],
        name: t.title,
        description: t.description,
        aboutText: t.longDescription.join("\n\n"),
        includedItems: t.included,
        notIncludedItems: t.notIncluded,
        programSteps: programSteps(t.itinerary),
      };
    });

    const body = {
      name: stay.title,
      slug: stay.slug,
      description: stay.description,
      aboutText: stay.longDescription.join("\n\n"),
      includedItems: stay.included,
      notIncludedItems: stay.notIncluded,
      programSteps: programSteps(stay.itinerary),
      location: "Sabria",
      coverPhotoUrl: stay.image,
      photos: photos(stay.gallery),
      translations,
      // See the file header — GAP, not a real per-audience price.
      passengerAdultPrice: stay.priceFrom,
      passengerChildPrice: stay.priceFrom,
      partnerAdultPrice: stay.priceFrom,
      partnerChildPrice: stay.priceFrom,
      tva: 13,
    };

    const { status, data } = await req("POST", "/tour-types", token, body);
    if (status === 201) {
      created++;
      console.log(`created  ${stay.slug} -> ${stay.title} (${stay.priceFrom} TND — same rate on all 4 price fields, see header)`);
    } else {
      skipped++;
      console.log(`skipped  ${stay.slug}  (${status}: ${JSON.stringify(data)})`);
    }
  }

  console.log(`\n${created} created, ${skipped} skipped (of ${fr.length} total).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
