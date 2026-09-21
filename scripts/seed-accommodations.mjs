#!/usr/bin/env node
// Creates the three real accommodation tiers for the fixed-camp nuitée
// (nuitee-campement-desert), transferred from frontend/lib/data/stays-i18n/fr.ts
// — the real, already-published content the /camp page renders from.
//
// PRICES ARE DELIBERATELY LEFT NULL (unitPriceTtc). Per Phase 1's F-2, the real
// 2026 per-tent/room/suite prices, the tva rate, the currency, and whether the
// `sleeps` figures are hard capacity caps are NOT yet confirmed by the business.
// Until an admin sets unit_price_ttc via /catalogue (or the API), each tier is:
//   • invisible on the vitrine (PublicStayMapper filters to bookable tiers)
//   • rejected at booking with "can't be booked online yet — contact the camp"
// nuitee-bivouac gets NO tiers — it has no accommodation choice.
//
//   node scripts/seed-accommodations.mjs
// Not idempotent — (tour_type_id, slug) is unique; a rerun 409s per row (logged).

// Hardcoded, deliberately not overridable via env var — this script writes
// catalog data via the admin API, and a stray BACKEND env var left set from
// another session could silently target a remote environment instead of
// this machine's own local backend.
const BACKEND = "http://127.0.0.1:8080/api";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "testadmin@dunes.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "AdminPass1!";
const STAY_SLUG = "nuitee-campement-desert";

const TIERS = [
  {
    slug: "desert-tent", name: "Tente du désert", capacity: 2, displayOrder: 0,
    description: "La nuit classique de Dunes Insolites : une tente privée, une literie soignée, et les dunes juste au-delà de votre porte.",
    imageUrl: "/images/under-hero.jpg",
    features: ["Tente en toile privée", "Literie de qualité", "Douches et toilettes du camp partagées", "Dîner et petit-déjeuner inclus"],
  },
  {
    slug: "desert-room", name: "Chambre du désert", capacity: 3, displayOrder: 1,
    description: "Pour les hôtes qui souhaitent l'atmosphère du désert avec un peu plus d'intimité et une nuit plus tranquille au campement fixe.",
    imageUrl: "/images/gate.jpg",
    features: ["Chambre fermée", "Espace de couchage privé", "Literie de qualité", "Dîner et petit-déjeuner inclus"],
  },
  {
    slug: "dune-suite", name: "Suite des dunes", capacity: 4, displayOrder: 2,
    description: "Un séjour désertique généreux pour les couples ou les familles, avec un espace supplémentaire pour se détendre après une soirée sous les étoiles.",
    imageUrl: "/images/hero-combined.jpg",
    features: ["Suite privée spacieuse", "Literie haut de gamme", "Espace salon supplémentaire", "Dîner et petit-déjeuner inclus"],
  },
];

async function req(method, path, token, body) {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

const login = async () => {
  const { status, data } = await req("POST", "/auth/login", null, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (status !== 200) throw new Error(`login failed: ${status} ${JSON.stringify(data)}`);
  return data.accessToken;
};

(async () => {
  const token = await login();
  const stays = await req("GET", "/tour-types", token);
  const stay = (stays.data ?? []).find((t) => t.slug === STAY_SLUG);
  if (!stay) throw new Error(`nuitée '${STAY_SLUG}' not found — run scripts/seed-tourtypes.mjs first`);

  for (const t of TIERS) {
    const { status, data } = await req("POST", "/accommodation-types", token, {
      tourTypeId: stay.tourTypeId,
      slug: t.slug, name: t.name, description: t.description, imageUrl: t.imageUrl,
      capacity: t.capacity, displayOrder: t.displayOrder, active: true,
      unitPriceTtc: null, tvaRate: null, currency: "TND",
      features: t.features,
    });
    console.log(status === 201
      ? `  ✓ ${t.name} (${t.slug}) — NO PRICE (admin must set unitPriceTtc — F-2)`
      : `  · ${t.slug}: ${status} ${JSON.stringify(data)}`);
  }
  console.log("\nDone. Every tier is unpriced → invisible on the vitrine, unbookable, until F-2.");
})().catch((e) => { console.error(e); process.exit(1); });
