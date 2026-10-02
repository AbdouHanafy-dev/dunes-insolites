package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.model.enums.ContentLocale;

import java.util.List;

/**
 * Machine translations, not yet saved. A language the provider could not produce is listed
 * in {@code failedLocales} instead of failing the whole call.
 */
public record AutoTranslateResponse(List<CatalogTranslationDto> translations, List<ContentLocale> failedLocales) {
}
