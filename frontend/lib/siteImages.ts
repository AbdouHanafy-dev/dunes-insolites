import type { SiteImageKey } from "@dunes/api-types";
import { isDisplayableImageSrc } from "@/lib/imageSrc";

/**
 * The photo the site shows for each replaceable slot until support sets
 * another one in the back office ("Photos du site"). The slot list itself
 * lives in packages/api-types, so a slot missing here fails to compile.
 */
export const DEFAULT_SITE_IMAGES: Record<SiteImageKey, string> = {
  "home.hero": "/images/gate.jpg",
  "home.cta": "/images/gate.jpg",
  "pagehead.circuits": "/images/quad.jpg",
  "pagehead.activities": "/images/hero-combined.jpg",
  "pagehead.camp": "/images/under-hero.jpg",
  "about.hero": "/images/gate.jpg",
  "about.story": "/images/under-hero.jpg",
  "about.sleep": "/images/under-hero.jpg",
  "about.traditions": "/images/camp-hero-poster.jpg",
  "about.dunes": "/images/sandboard.jpg",
  "about.share": "/images/camel.jpg",
  "about.team": "/images/hero-combined.jpg",
  "about.final": "/images/gate.jpg",
  "activity.quad": "/images/quad.jpg",
  "activity.camel": "/images/camel.jpg",
  "activity.sandboarding": "/images/sandboard.jpg",
  "activity.fourx4": "/images/hero-combined.jpg",
  "stay.campement": "/images/under-hero.jpg",
  "stay.bivouac": "/images/camp-hero-poster.jpg",
  "circuit.default": "/images/camel.jpg",
  "accommodation.final": "/images/gate.jpg",
  "gallery.1": "/images/gate.jpg",
  "gallery.2": "/images/hero-combined.jpg",
  "gallery.3": "/images/under-hero.jpg",
  "gallery.4": "/images/camp-hero-poster.jpg",
  "gallery.5": "/images/sandboard.jpg",
};

/**
 * Overlays the replaced slots on the built-in photos. Anything that is not
 * a usable image address is ignored, so a bad value can never blank a page.
 */
export function resolveSiteImages(overrides: Record<string, string>): Record<SiteImageKey, string> {
  const out = { ...DEFAULT_SITE_IMAGES };
  for (const key of Object.keys(out) as SiteImageKey[]) {
    const value = overrides[key];
    if (isDisplayableImageSrc(value)) out[key] = value;
  }
  return out;
}

/**
 * The photo of a card whose item has no cover photo yet. The item's own
 * photo always wins; these defaults only stop a card from being blank.
 */
export function activityCardFallback(images: Record<SiteImageKey, string>, slug: string): string {
  if (slug === "quad-desert") return images["activity.quad"];
  if (slug === "camel-trek") return images["activity.camel"];
  if (slug === "sandboarding-desert") return images["activity.sandboarding"];
  return images["gallery.1"];
}

export function stayCardFallback(images: Record<SiteImageKey, string>, slug: string): string {
  return slug.includes("bivouac") ? images["stay.bivouac"] : images["stay.campement"];
}
