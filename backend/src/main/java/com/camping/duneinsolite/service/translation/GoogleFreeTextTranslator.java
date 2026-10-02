package com.camping.duneinsolite.service.translation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Calls the web endpoint behind translate.google.com (no key, no account).
 *
 * It is unofficial: Google may throttle it, change its response or block the
 * server's address without notice. Every caller therefore has to treat a
 * {@link TranslationUnavailableException} as routine and never let it fail a save.
 */
@Component
public class GoogleFreeTextTranslator implements TextTranslator {

    private static final URI ENDPOINT = URI.create("https://translate.googleapis.com/translate_a/single");
    /** Long texts are split on line breaks so one request stays well under the endpoint's size limit. */
    static final int MAX_CHUNK = 3500;

    // Not autowired: no ObjectMapper bean is registered in this app (same convention as PublicPageController).
    private static final ObjectMapper JSON = new ObjectMapper();

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Override
    public String translate(String text, String targetLang) {
        StringBuilder out = new StringBuilder();
        for (String chunk : chunks(text)) {
            if (out.length() > 0) out.append('\n');
            out.append(chunk.isBlank() ? chunk : translateChunk(chunk, targetLang));
        }
        return out.toString();
    }

    /** Groups whole lines into pieces of at most {@link #MAX_CHUNK} characters; a longer single line goes alone. */
    public static List<String> chunks(String text) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            if (current.length() > 0 && current.length() + line.length() + 1 > MAX_CHUNK) {
                result.add(current.toString());
                current.setLength(0);
            }
            if (current.length() > 0) current.append('\n');
            current.append(line);
        }
        result.add(current.toString());
        return result;
    }

    private String translateChunk(String chunk, String targetLang) {
        String form = "client=gtx&sl=fr&tl=" + URLEncoder.encode(targetLang, StandardCharsets.UTF_8)
                + "&dt=t&q=" + URLEncoder.encode(chunk, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(ENDPOINT)
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new TranslationUnavailableException(
                        new IOException("Translation endpoint answered HTTP " + response.statusCode()));
            }
            return parse(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new TranslationUnavailableException(e);
        } catch (IOException e) {
            throw new TranslationUnavailableException(e);
        }
    }

    /** The answer is {@code [[["translated","source",...],...],...]}: join the first cell of each segment. */
    public static String parse(String body) {
        try {
            JsonNode segments = JSON.readTree(body).path(0);
            if (!segments.isArray() || segments.isEmpty()) {
                throw new TranslationUnavailableException(new IOException("Unexpected translation response"));
            }
            StringBuilder out = new StringBuilder();
            for (JsonNode segment : segments) out.append(segment.path(0).asText(""));
            return out.toString();
        } catch (IOException e) {
            throw new TranslationUnavailableException(e);
        }
    }
}
