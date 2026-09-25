package com.camping.duneinsolite.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Stores a step's image URLs in one TEXT column, one URL per line (URLs never contain a newline). */
@Converter
public class ImageUrlListConverter implements AttributeConverter<List<String>, String> {

    @Override
    public String convertToDatabaseColumn(List<String> urls) {
        if (urls == null || urls.isEmpty()) return null;
        return String.join("\n", urls);
    }

    @Override
    public List<String> convertToEntityAttribute(String column) {
        if (column == null || column.isBlank()) return new ArrayList<>();
        return new ArrayList<>(Arrays.stream(column.split("\n")).filter(s -> !s.isBlank()).toList());
    }
}
