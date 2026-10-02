package com.camping.duneinsolite.mapper.publicapi;

import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.enums.TourSegmentType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PublicCatalogTranslationTest {

    @Test
    void translatedStepKeepsTheSourceStepsStructure() {
        ProgramStep french = new ProgramStep("Jour 1", "Départ", "Départ de Djerba");
        french.setSegmentType(TourSegmentType.values()[TourSegmentType.values().length - 1]);
        french.setOptionalSegment(true);
        french.setDurationMinutes(90);
        french.setPickupPoint("Houmet Souk");
        french.setImageUrls(List.of("a.jpg"));

        // A translation row only ever carries the defaults for the structural fields.
        ProgramStep german = new ProgramStep("Tag 1", "Abfahrt", "Abfahrt von Djerba");

        ProgramStep merged = PublicCatalogTranslation.steps(List.of(french), List.of(german)).get(0);

        assertEquals("Abfahrt", merged.getTitle());
        assertEquals(french.getSegmentType(), merged.getSegmentType());
        assertTrue(merged.getOptionalSegment());
        assertEquals(90, merged.getDurationMinutes());
        assertEquals("Houmet Souk", merged.getPickupPoint());
        assertEquals(List.of("a.jpg"), merged.getImageUrls());
    }
}
