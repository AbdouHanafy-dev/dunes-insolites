"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Favourites ("favoris"). A guest's list lives in this browser only
 * (localStorage, per-viewer convenience). When someone is logged in the same
 * list is also saved to their account (the /api/favorites routes), so it
 * follows them across devices and shows in their space. At login the two
 * are merged (`syncOnLogin`). Never authoritative for anything but the
 * heart icons and the favourites page.
 */

export type FavoriteKind = "tour" | "stay" | "activity";

const STORAGE_KEY = "wishlist";
const CHANGE_EVENT = "wishlist:change";
const KINDS: FavoriteKind[] = ["tour", "stay", "activity"];

/** Whether the visitor is logged in, so a toggle is also sent to the server. */
let serverSync = false;
export function setServerSync(on: boolean) {
  serverSync = on;
}

const keyOf = (kind: FavoriteKind, slug: string) => `${kind}:${slug}`;

/** "kind:slug" strings; an older plain "slug" entry (circuits only, back then) reads as a circuit. */
function normalize(entries: unknown): string[] {
  if (!Array.isArray(entries)) return [];
  const out: string[] = [];
  for (const entry of entries) {
    if (typeof entry !== "string" || !entry) continue;
    const idx = entry.indexOf(":");
    const kind = idx > 0 ? entry.slice(0, idx) : "tour";
    const slug = idx > 0 ? entry.slice(idx + 1) : entry;
    if (!KINDS.includes(kind as FavoriteKind) || !slug) continue;
    const key = keyOf(kind as FavoriteKind, slug);
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

function readRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function parse(raw: string): string[] {
  try {
    return raw ? normalize(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function writeKeys(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Private window / blocked storage: the toggle still works for this
    // render, it just will not persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The saved items as "kind:slug" keys, oldest first. Re-renders on every change, from any tab. */
export function useFavoriteKeys(): string[] {
  // The raw string is the snapshot (stable while unchanged); the list is derived from it.
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => parse(raw), [raw]);
}

/** Adds or removes one item; returns whether it is saved afterwards. */
export function toggleFavorite(kind: FavoriteKind, slug: string): boolean {
  const keys = parse(readRaw());
  const key = keyOf(kind, slug);
  const saved = !keys.includes(key);
  writeKeys(saved ? [...keys, key] : keys.filter((k) => k !== key));
  if (serverSync) {
    fetch(`/api/favorites/${kind}/${encodeURIComponent(slug)}`, { method: saved ? "PUT" : "DELETE" }).catch(() => {
      // Offline or backend hiccup: the local list is still right; the next login merge re-sends it.
    });
  }
  return saved;
}

/** Forgets the browser's list (on logout, so the next person on this device does not see it). */
export function clearFavorites() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to clear
  }
  setServerSync(false);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * After login: send the browser's list to the account, then adopt the
 * account's full list (the union) as the local one.
 */
export async function syncOnLogin(): Promise<void> {
  setServerSync(true);
  const items = parse(readRaw()).map((key) => {
    const idx = key.indexOf(":");
    return { type: key.slice(0, idx).toUpperCase(), slug: key.slice(idx + 1) };
  });
  try {
    const res = await fetch("/api/favorites/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) return;
    const saved = (await res.json()) as { type: string; slug: string }[];
    // The server list is newest first; the local one is oldest first.
    writeKeys(normalize([...saved].reverse().map((f) => `${f.type.toLowerCase()}:${f.slug}`)));
  } catch {
    // Keep the local list; the merge is retried on the next page load.
  }
}
