package com.camping.duneinsolite.model.enums;

// Nullable on Page - null means "an ordinary static page" (about, safety,
// contact - each wired to one specific frontend route by slug already).
// GUIDE is the first real category: it's what lets the vitrine's /guides
// index discover pages by category instead of a developer having to
// hardcode every new article's slug into the frontend (see frontend's
// lib/guides.ts, which this replaces as the source of truth for
// admin-created articles - the two seed articles stay as a hardcoded
// fallback only for when the backend has nothing published yet).
public enum PageCategory {
    GUIDE
}
