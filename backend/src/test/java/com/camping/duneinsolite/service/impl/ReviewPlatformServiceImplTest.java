package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ReviewPlatformRequest;
import com.camping.duneinsolite.dto.response.ReviewPlatformResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.model.ReviewPlatform;
import com.camping.duneinsolite.repository.ExternalReviewRepository;
import com.camping.duneinsolite.repository.ReviewPlatformRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReviewPlatformServiceImplTest {

    private ReviewPlatformRepository platforms;
    private ExternalReviewRepository reviews;
    private ReviewPlatformServiceImpl service;

    private final ReviewPlatform google = ReviewPlatform.builder()
            .platformId(UUID.randomUUID()).name("Google").color("#4285F4").sourceKey("google").build();

    @BeforeEach
    void setUp() {
        platforms = mock(ReviewPlatformRepository.class);
        reviews = mock(ExternalReviewRepository.class);
        when(platforms.save(any(ReviewPlatform.class))).thenAnswer(inv -> inv.getArgument(0));
        when(platforms.findById(google.getPlatformId())).thenReturn(Optional.of(google));
        service = new ReviewPlatformServiceImpl(platforms, reviews);
    }

    private static ReviewPlatformRequest request(String name, String color) {
        ReviewPlatformRequest r = new ReviewPlatformRequest();
        r.setName(name);
        r.setColor(color);
        return r;
    }

    @Test
    void createTrimsTheNameAndKeepsTheColour() {
        ReviewPlatformResponse created = service.create(request("  Viator ", "#7B2CBF"));

        assertThat(created.getName()).isEqualTo("Viator");
        assertThat(created.getColor()).isEqualTo("#7B2CBF");
        assertThat(created.isBuiltIn()).isFalse();
    }

    @Test
    void createRejectsANameThatAlreadyExistsIgnoringCase() {
        when(platforms.findByNameIgnoreCase("GOOGLE")).thenReturn(Optional.of(google));

        assertThatThrownBy(() -> service.create(request("GOOGLE", "#000000")))
                .isInstanceOf(ConflictException.class);
        verify(platforms, never()).save(any(ReviewPlatform.class));
    }

    @Test
    void updateMayKeepItsOwnNameWhileChangingTheColour() {
        when(platforms.findByNameIgnoreCase("Google")).thenReturn(Optional.of(google));

        ReviewPlatformResponse updated = service.update(google.getPlatformId(), request("Google", "#112233"));

        assertThat(updated.getColor()).isEqualTo("#112233");
        assertThat(updated.isBuiltIn()).isTrue();
    }

    @Test
    void aPlatformStillUsedByReviewsCannotBeDeleted() {
        when(reviews.countByPlatform_PlatformId(google.getPlatformId())).thenReturn(3L);

        assertThatThrownBy(() -> service.delete(google.getPlatformId())).isInstanceOf(ConflictException.class);
        verify(platforms, never()).delete(any(ReviewPlatform.class));
    }

    @Test
    void anUnusedPlatformCanBeDeleted() {
        when(reviews.countByPlatform_PlatformId(google.getPlatformId())).thenReturn(0L);

        service.delete(google.getPlatformId());

        verify(platforms).delete(google);
    }
}
