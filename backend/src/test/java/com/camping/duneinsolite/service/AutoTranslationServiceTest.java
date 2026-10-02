package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.AutoTranslateRequest;
import com.camping.duneinsolite.dto.response.AutoTranslateResponse;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.ContentLocale;
import com.camping.duneinsolite.service.impl.AutoTranslationServiceImpl;
import com.camping.duneinsolite.service.translation.GoogleFreeTextTranslator;
import com.camping.duneinsolite.service.translation.TextTranslator;
import com.camping.duneinsolite.service.translation.TranslationUnavailableException;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AutoTranslationServiceTest {

    private static final List<String> TERMS = List.of("Sabria", "Dune Suite");

    /** Pretends to translate by tagging the language, and leaves markers alone like a well-behaved provider. */
    private static AutoTranslationServiceImpl service(TextTranslator translator) {
        return new AutoTranslationServiceImpl(translator, TERMS);
    }

    private static AutoTranslateRequest request(ContentLocale... locales) {
        AutoTranslateRequest r = new AutoTranslateRequest();
        r.setName("Nuit à Sabria");
        r.setDescription("Une nuit dans le désert.");
        r.setHighlights(List.of("Coucher de soleil", "", "Dîner"));
        ProgramStep step = new ProgramStep("Jour 1", "Départ", "Départ de Djerba");
        step.setPickupPoint("Houmet Souk");
        step.setDurationMinutes(90);
        r.setProgramSteps(List.of(step));
        r.setLocales(List.of(locales));
        return r;
    }

    @Test
    void translatesEveryFieldAndKeepsListPositions() {
        AutoTranslationServiceImpl svc = service((text, lang) -> "[" + lang + "] " + text);

        AutoTranslateResponse out = svc.translate(request(ContentLocale.DE));

        assertTrue(out.failedLocales().isEmpty());
        var de = out.translations().get(0);
        assertEquals(ContentLocale.DE, de.getLocale());
        assertEquals("[de] Nuit à Sabria", de.getName());
        // The blank French item stays blank so index 2 still pairs with French item 2.
        assertEquals(List.of("[de] Coucher de soleil", "", "[de] Dîner"), de.getHighlights());
        ProgramStep step = de.getProgramSteps().get(0);
        assertEquals("[de] Départ", step.getTitle());
        assertEquals("[de] Houmet Souk", step.getPickupPoint());
        assertEquals(90, step.getDurationMinutes());
    }

    @Test
    void protectsBrandNamesFromTheProvider() {
        // A provider that rewrites every word it recognises, but not the markers.
        AutoTranslationServiceImpl svc = service((text, lang) -> text.replace("Nuit", "Night"));

        assertEquals("Night à Sabria", svc.translate(request(ContentLocale.EN)).translations().get(0).getName());
    }

    @Test
    void fallsBackToPlainTranslationWhenAMarkerIsMangled() {
        // The provider eats markers whenever it sees one.
        TextTranslator eater = (text, lang) -> text.contains("QX") ? "Night at somewhere" : "Night at Sabria";
        AutoTranslationServiceImpl svc = service(eater);

        assertEquals("Night at Sabria", svc.translate(request(ContentLocale.EN)).translations().get(0).getName());
    }

    @Test
    void reportsALanguageThatFailedWithoutLosingTheOthers() {
        TextTranslator flaky = (text, lang) -> {
            if (lang.equals("ar")) throw new TranslationUnavailableException(new IOException("blocked"));
            return text;
        };

        AutoTranslateResponse out = service(flaky).translate(request(ContentLocale.DE, ContentLocale.AR, ContentLocale.IT));

        assertEquals(List.of(ContentLocale.AR), out.failedLocales());
        assertEquals(List.of(ContentLocale.DE, ContentLocale.IT),
                out.translations().stream().map(t -> t.getLocale()).toList());
    }

    @Test
    void rejectsAnOversizedRequest() {
        AutoTranslateRequest r = request(ContentLocale.EN);
        r.setAboutText("x".repeat(AutoTranslationServiceImpl.MAX_SOURCE_CHARS + 1));
        assertThrows(IllegalArgumentException.class, () -> service((t, l) -> t).translate(r));
    }

    @Test
    void parsesTheProvidersSegmentedAnswer() {
        String body = "[[[\"Hello \",\"Bonjour \",null,null,1],[\"world\",\"monde\",null,null,1]],null,\"fr\"]";
        assertEquals("Hello world", GoogleFreeTextTranslator.parse(body));
        assertThrows(TranslationUnavailableException.class, () -> GoogleFreeTextTranslator.parse("<html>blocked</html>"));
    }

    @Test
    void splitsLongTextOnLineBreaksOnly() {
        String line = "a".repeat(2000);
        List<String> chunks = GoogleFreeTextTranslator.chunks(line + "\n" + line + "\n" + line);
        assertEquals(3, chunks.size());
        assertEquals(List.of("short"), GoogleFreeTextTranslator.chunks("short"));
    }
}
