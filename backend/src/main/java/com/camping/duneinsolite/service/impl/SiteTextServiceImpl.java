package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.service.SiteTextService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SiteTextServiceImpl implements SiteTextService {

    private final JdbcTemplate jdbc;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Map<String, String>> all() {
        Map<String, Map<String, String>> byLocale = new LinkedHashMap<>();
        jdbc.query("SELECT locale, text_key, text_value FROM site_text_override ORDER BY locale, text_key",
                rs -> {
                    byLocale.computeIfAbsent(rs.getString("locale"), l -> new LinkedHashMap<>())
                            .put(rs.getString("text_key"), rs.getString("text_value"));
                });
        return byLocale;
    }

    @Override
    @Transactional
    public void set(String locale, String key, String value) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty()) {
            jdbc.update("DELETE FROM site_text_override WHERE locale = ? AND text_key = ?", locale, key);
            return;
        }
        jdbc.update("""
                INSERT INTO site_text_override (locale, text_key, text_value, updated_at)
                VALUES (?, ?, ?, now())
                ON CONFLICT (locale, text_key) DO UPDATE SET text_value = EXCLUDED.text_value, updated_at = now()
                """, locale, key, text);
    }
}
