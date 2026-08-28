package com.camping.duneinsolite.model.enums;

/**
 * Whether a nav item opens a mega-menu dropdown, and which one. The
 * dropdown's actual content (activity/stay cards) is always built from
 * live catalogue data by the vitrine — this only says which item triggers
 * which dropdown, not what's in it. See frontend/components/Header.tsx.
 */
public enum NavMenuType {
    NONE,
    EXPERIENCES,
    STAYS
}
