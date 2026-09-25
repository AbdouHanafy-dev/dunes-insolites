package com.camping.duneinsolite.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TourDurationTest {

    @Test
    void labelsHoursDaysAndRemainder() {
        assertEquals("6 h", TourDuration.label(6));
        assertEquals("1 jour (24 h)", TourDuration.label(24));
        assertEquals("1 jour et 2 h (26 h)", TourDuration.label(26));
        assertEquals("2 jours (48 h)", TourDuration.label(48));
        assertEquals("3 jours et 5 h (77 h)", TourDuration.label(77));
        assertNull(TourDuration.label(null));
    }

    @Test
    void onlyMoreThanADayIsMultiDay() {
        assertFalse(TourDuration.isMultiDay(null));
        assertFalse(TourDuration.isMultiDay(24));
        assertTrue(TourDuration.isMultiDay(25));
        assertTrue(TourDuration.isMultiDay(72));
    }
}
