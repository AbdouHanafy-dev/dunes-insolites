package com.camping.duneinsolite.model;

import com.camping.duneinsolite.model.enums.ContentLocale;

import java.util.List;

/**
 * Common shape of TourTypeTranslation and ExtraTranslation, so
 * PublicCatalogTranslation can resolve either one the same way instead of
 * duplicating the fallback logic per entity.
 */
public interface CatalogTranslation {
    ContentLocale getLocale();
    String getName();
    String getDescription();
    String getAboutText();
    List<String> getHighlights();
    List<String> getIncludedItems();
    List<String> getNotIncludedItems();
    List<ProgramStep> getProgramSteps();
}
