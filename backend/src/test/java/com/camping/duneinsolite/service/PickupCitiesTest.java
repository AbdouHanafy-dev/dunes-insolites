package com.camping.duneinsolite.service;

import com.camping.duneinsolite.exception.InvalidPickupCitiesException;
import com.camping.duneinsolite.model.enums.DepartureCity;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class PickupCitiesTest {

    @Test
    void departureNeedsAtLeastOneCity() {
        assertThrows(InvalidPickupCitiesException.class,
                () -> PickupCities.departureForSave(Set.of(), null));
    }

    @Test
    void returnMayBeEmptyToHideTheQuestion() {
        assertTrue(PickupCities.returnForSave(Set.of(), PickupCities.all()).isEmpty());
    }

    @Test
    void omittedListsKeepThePreviousOrDefaultToAll() {
        Set<DepartureCity> previous = EnumSet.of(DepartureCity.TUNIS);
        assertEquals(previous, PickupCities.departureForSave(null, previous));
        assertEquals(PickupCities.all(), PickupCities.departureForSave(null, null));
        assertEquals(previous, PickupCities.returnForSave(null, previous));
    }

    @Test
    void aBookingMayOnlyPickAnOfferedCity() {
        Set<DepartureCity> offered = EnumSet.of(DepartureCity.TUNIS, DepartureCity.TOZEUR);
        assertDoesNotThrow(() -> PickupCities.requireOffered("departure", "TUNIS", offered));
        assertDoesNotThrow(() -> PickupCities.requireOffered("departure", null, offered));
        assertThrows(InvalidPickupCitiesException.class,
                () -> PickupCities.requireOffered("departure", "HAMMAMET", offered));
        assertThrows(InvalidPickupCitiesException.class,
                () -> PickupCities.requireOffered("return", "TUNIS", Set.of()));
    }

    @Test
    void namesFollowDeclarationOrder() {
        assertEquals(java.util.List.of("TUNIS", "TOZEUR"),
                PickupCities.names(EnumSet.of(DepartureCity.TOZEUR, DepartureCity.TUNIS)));
    }
}
