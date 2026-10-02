package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.AutoTranslateRequest;
import com.camping.duneinsolite.dto.response.AutoTranslateResponse;

/** Machine-translates a catalogue item's French copy (nuitée, circuit, extra) into the other site languages. */
public interface AutoTranslationService {

    AutoTranslateResponse translate(AutoTranslateRequest request);
}
