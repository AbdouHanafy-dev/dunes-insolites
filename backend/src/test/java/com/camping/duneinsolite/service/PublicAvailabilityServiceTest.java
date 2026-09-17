package com.camping.duneinsolite.service;

import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.ExtraResourceRequirement;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * forServiceOption() had zero coverage before a real E2E pass against a
 * live backend found it NPEs whenever a service option has no
 * maxUnitsPerDay configured (the UNKNOWN case) — a ternary mixing an int
 * literal with a boxed Integer force-unboxes the null branch. Every case
 * here is a real, previously-unexercised code path, not a re-test of
 * something ExtraAvailabilityServiceTest already covers (that class is
 * mocked out here entirely).
 */
class PublicAvailabilityServiceTest {

    private ExtraRepository extraRepository;
    private ExtraAvailabilityService extraAvailabilityService;
    private PublicAvailabilityService service;

    private final LocalDate day = LocalDate.of(2026, 11, 15);

    private Extra option(String slug, List<ExtraResourceRequirement> requirements) {
        return Extra.builder().extraId(UUID.randomUUID()).slug(slug).name(slug)
                .resourceRequirements(requirements).build();
    }

    @BeforeEach
    void setUp() {
        extraRepository = mock(ExtraRepository.class);
        extraAvailabilityService = mock(ExtraAvailabilityService.class);
        service = new PublicAvailabilityService(
                mock(TourTypeRepository.class), mock(AccommodationTypeRepository.class),
                mock(AccommodationAvailabilityService.class), extraRepository, extraAvailabilityService);
    }

    @Test
    void unknownCapacity_doesNotThrow_reportsUnknownWithNullUnits() {
        Extra option = option("guide-support", List.of());
        when(extraRepository.findBySlugAndIsActiveTrue("guide-support")).thenReturn(Optional.of(option));
        when(extraAvailabilityService.status(option, day))
                .thenReturn(new ExtraAvailabilityService.Availability(ExtraAvailabilityService.Status.UNKNOWN, null));

        assertThatCode(() -> service.forServiceOption("guide-support", day)).doesNotThrowAnyException();

        var result = service.forServiceOption("guide-support", day);
        assertThat(result.status()).isEqualTo("UNKNOWN");
        assertThat(result.unitsAvailable()).isNull();
    }

    @Test
    void available_reportsRemainingUnits() {
        Extra option = option("guide-support", List.of());
        when(extraRepository.findBySlugAndIsActiveTrue("guide-support")).thenReturn(Optional.of(option));
        when(extraAvailabilityService.status(option, day))
                .thenReturn(new ExtraAvailabilityService.Availability(ExtraAvailabilityService.Status.AVAILABLE, 3));

        var result = service.forServiceOption("guide-support", day);
        assertThat(result.status()).isEqualTo("AVAILABLE");
        assertThat(result.unitsAvailable()).isEqualTo(3);
    }

    @Test
    void unavailable_reportsZeroUnits_notNull() {
        Extra option = option("guide-support", List.of());
        when(extraRepository.findBySlugAndIsActiveTrue("guide-support")).thenReturn(Optional.of(option));
        when(extraAvailabilityService.status(option, day))
                .thenReturn(new ExtraAvailabilityService.Availability(ExtraAvailabilityService.Status.UNAVAILABLE, 0));

        var result = service.forServiceOption("guide-support", day);
        assertThat(result.status()).isEqualTo("UNAVAILABLE");
        assertThat(result.unitsAvailable()).isEqualTo(0);
    }

    @Test
    void compositeOption_isLimitedByItsScarcestResource() {
        Extra vehicle = option("support-vehicle", List.of());
        Extra composite = option("guide-with-vehicle",
                List.of(ExtraResourceRequirement.builder().resource(vehicle).quantity(1).build()));
        when(extraRepository.findBySlugAndIsActiveTrue("guide-with-vehicle")).thenReturn(Optional.of(composite));
        // The option itself has plenty of capacity, but only 1 support vehicle is left.
        when(extraAvailabilityService.status(composite, day))
                .thenReturn(new ExtraAvailabilityService.Availability(ExtraAvailabilityService.Status.AVAILABLE, 5));
        when(extraAvailabilityService.status(vehicle, day))
                .thenReturn(new ExtraAvailabilityService.Availability(ExtraAvailabilityService.Status.AVAILABLE, 1));

        var result = service.forServiceOption("guide-with-vehicle", day);
        assertThat(result.status()).isEqualTo("AVAILABLE");
        assertThat(result.unitsAvailable()).isEqualTo(1);
    }

    @Test
    void compositeOption_isUnavailableWhenItsResourceIsSoldOut() {
        Extra vehicle = option("support-vehicle", List.of());
        Extra composite = option("guide-with-vehicle",
                List.of(ExtraResourceRequirement.builder().resource(vehicle).quantity(1).build()));
        when(extraRepository.findBySlugAndIsActiveTrue("guide-with-vehicle")).thenReturn(Optional.of(composite));
        when(extraAvailabilityService.status(composite, day))
                .thenReturn(new ExtraAvailabilityService.Availability(ExtraAvailabilityService.Status.AVAILABLE, 5));
        when(extraAvailabilityService.status(vehicle, day))
                .thenReturn(new ExtraAvailabilityService.Availability(ExtraAvailabilityService.Status.UNAVAILABLE, 0));

        var result = service.forServiceOption("guide-with-vehicle", day);
        assertThat(result.status()).isEqualTo("UNAVAILABLE");
        assertThat(result.unitsAvailable()).isEqualTo(0);
    }
}
