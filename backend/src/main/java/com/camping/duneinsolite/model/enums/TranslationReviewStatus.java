package com.camping.duneinsolite.model.enums;

/**
 * Where a language's translation stands. A translation with no status was written by hand (or saved
 * before this existed) and is neither flagged nor treated as stale.
 */
public enum TranslationReviewStatus {
    /** Written by the machine translator, not yet read by a person. */
    AUTO,
    /** A person has checked it. */
    REVIEWED
}
