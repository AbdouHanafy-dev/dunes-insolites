package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.CatalogTranslationDto;
import com.camping.duneinsolite.dto.request.AutoTranslateRequest;
import com.camping.duneinsolite.dto.response.AutoTranslateResponse;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.ContentLocale;
import com.camping.duneinsolite.service.AutoTranslationService;
import com.camping.duneinsolite.service.translation.TextTranslator;
import com.camping.duneinsolite.service.translation.TranslationUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class AutoTranslationServiceImpl implements AutoTranslationService {

    /** One request is bounded so a pasted novel cannot burn the free endpoint's tolerance. */
    public static final int MAX_SOURCE_CHARS = 30_000;

    private static final Pattern TOKEN = Pattern.compile("QX(\\d+)Q", Pattern.CASE_INSENSITIVE);

    private final TextTranslator translator;
    private final List<String> protectedTerms;
    // One thread per language: a form has up to five, and sequential calls would make the button slow.
    private final ExecutorService pool = Executors.newFixedThreadPool(5, r -> {
        Thread t = new Thread(r, "auto-translate");
        t.setDaemon(true);
        return t;
    });

    public AutoTranslationServiceImpl(
            TextTranslator translator,
            @Value("${translation.protected-terms:Sabria,Dunes Insolites,Route Insolite,Dune Suite,Desert Tent,Desert Room}")
            List<String> protectedTerms) {
        this.translator = translator;
        // Longest first, so "Dunes Insolites" wins over a shorter term it contains.
        this.protectedTerms = protectedTerms.stream().map(String::trim).filter(s -> !s.isEmpty())
                .sorted((a, b) -> b.length() - a.length()).toList();
    }

    @Override
    public AutoTranslateResponse translate(AutoTranslateRequest request) {
        if (sourceLength(request) > MAX_SOURCE_CHARS) {
            throw new IllegalArgumentException("The text to translate is too long");
        }
        List<ContentLocale> locales = request.getLocales().stream().distinct().toList();
        List<CompletableFuture<CatalogTranslationDto>> jobs = locales.stream()
                .map(locale -> CompletableFuture.supplyAsync(() -> forLocale(request, locale), pool)
                        .exceptionally(e -> {
                            // Routine with an unofficial provider; the caller reports the language as not done.
                            log.warn("Auto-translation to {} failed: {}", locale, e.getMessage());
                            return null;
                        }))
                .toList();

        List<CatalogTranslationDto> done = new ArrayList<>();
        List<ContentLocale> failed = new ArrayList<>();
        for (int i = 0; i < locales.size(); i++) {
            CatalogTranslationDto dto = jobs.get(i).join();
            if (dto == null) failed.add(locales.get(i));
            else done.add(dto);
        }
        return new AutoTranslateResponse(done, failed);
    }

    private CatalogTranslationDto forLocale(AutoTranslateRequest source, ContentLocale locale) {
        String lang = locale.name().toLowerCase(Locale.ROOT);
        CatalogTranslationDto dto = new CatalogTranslationDto();
        dto.setLocale(locale);
        dto.setName(text(source.getName(), lang));
        dto.setDescription(text(source.getDescription(), lang));
        dto.setAboutText(text(source.getAboutText(), lang));
        dto.setHighlights(list(source.getHighlights(), lang));
        dto.setIncludedItems(list(source.getIncludedItems(), lang));
        dto.setNotIncludedItems(list(source.getNotIncludedItems(), lang));
        dto.setProgramSteps(steps(source.getProgramSteps(), lang));
        return dto;
    }

    private List<ProgramStep> steps(List<ProgramStep> source, String lang) {
        if (source == null) return List.of();
        List<ProgramStep> out = new ArrayList<>();
        for (ProgramStep s : source) {
            ProgramStep t = new ProgramStep(text(s.getLabel(), lang), text(s.getTitle(), lang), text(s.getDescription(), lang));
            // Same step, same structure: only the wording changes.
            t.setSegmentType(s.getSegmentType());
            t.setOptionalSegment(s.getOptionalSegment());
            t.setDurationMinutes(s.getDurationMinutes());
            t.setPickupPoint(text(s.getPickupPoint(), lang));
            t.setDropoffPoint(text(s.getDropoffPoint(), lang));
            t.setAttraction(text(s.getAttraction(), lang));
            out.add(t);
        }
        return out;
    }

    /** Keeps positions: a blank French item stays blank, so index N still lines up with French item N. */
    private List<String> list(List<String> source, String lang) {
        if (source == null) return List.of();
        return source.stream().map(item -> text(item, lang)).toList();
    }

    String text(String source, String lang) {
        if (source == null || source.isBlank()) return source == null ? null : "";
        List<String> found = new ArrayList<>();
        String shielded = shield(source, found);
        String translated = translator.translate(shielded, lang);
        if (found.isEmpty()) return translated;
        String restored = unshield(translated, found);
        // A mangled marker would lose a brand name; translating the plain text is the safe fallback.
        return restored != null ? restored : translator.translate(source, lang);
    }

    /** Swaps brand and product names for markers the provider leaves alone. */
    String shield(String text, List<String> found) {
        String result = text;
        for (String term : protectedTerms) {
            Matcher m = Pattern.compile(Pattern.quote(term), Pattern.CASE_INSENSITIVE).matcher(result);
            StringBuilder sb = new StringBuilder();
            while (m.find()) {
                found.add(m.group());
                m.appendReplacement(sb, Matcher.quoteReplacement("QX" + (found.size() - 1) + "Q"));
            }
            m.appendTail(sb);
            result = sb.toString();
        }
        return result;
    }

    /** @return the text with every term restored, or null when a marker did not survive translation */
    String unshield(String translated, List<String> found) {
        Matcher m = TOKEN.matcher(translated);
        StringBuilder sb = new StringBuilder();
        boolean[] seen = new boolean[found.size()];
        while (m.find()) {
            int index = Integer.parseInt(m.group(1));
            if (index >= found.size()) return null;
            seen[index] = true;
            m.appendReplacement(sb, Matcher.quoteReplacement(found.get(index)));
        }
        m.appendTail(sb);
        for (boolean s : seen) if (!s) return null;
        return sb.toString();
    }

    private static int sourceLength(AutoTranslateRequest r) {
        int n = len(r.getName()) + len(r.getDescription()) + len(r.getAboutText());
        for (List<String> l : java.util.Arrays.asList(r.getHighlights(), r.getIncludedItems(), r.getNotIncludedItems())) {
            if (l != null) for (String s : l) n += len(s);
        }
        if (r.getProgramSteps() != null) {
            for (ProgramStep s : r.getProgramSteps()) {
                n += len(s.getLabel()) + len(s.getTitle()) + len(s.getDescription())
                        + len(s.getPickupPoint()) + len(s.getDropoffPoint()) + len(s.getAttraction());
            }
        }
        return n;
    }

    private static int len(String s) {
        return s == null ? 0 : s.length();
    }
}
