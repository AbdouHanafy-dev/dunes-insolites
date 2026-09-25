package com.camping.duneinsolite.exception;

import com.camping.duneinsolite.dto.request.GuideStaffRequest;
import com.camping.duneinsolite.dto.request.ReservationStaffRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Assigning a guide from the permanent directory sends only the profile id.
 * The request used to demand a first and last name as well, so the back
 * office's "Affecter" button was refused with "First name is required" for
 * every directory guide.
 */
class GuideStaffRequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aDirectoryGuideNeedsOnlyItsProfileId() {
        GuideStaffRequest guide = new GuideStaffRequest();
        guide.setGuideProfileId(UUID.randomUUID());
        ReservationStaffRequest request = new ReservationStaffRequest();
        request.setGuides(List.of(guide));

        assertThat(validator.validate(request)).isEmpty();
    }
}
