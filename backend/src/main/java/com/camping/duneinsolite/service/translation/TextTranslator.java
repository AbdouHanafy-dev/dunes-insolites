package com.camping.duneinsolite.service.translation;

/**
 * Turns one French text into another language. Kept as a seam so the provider
 * can change (the current one is an unofficial free endpoint) without touching
 * the code that decides what to translate.
 */
public interface TextTranslator {

    /**
     * @param text       French source, never blank
     * @param targetLang lower-case ISO 639-1 code, e.g. "de"
     * @throws TranslationUnavailableException when the provider fails or refuses
     */
    String translate(String text, String targetLang);
}
