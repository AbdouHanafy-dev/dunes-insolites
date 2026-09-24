package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.ExternalReviewRequest;
import com.camping.duneinsolite.dto.response.ExternalReviewResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicReviewResponse;
import com.camping.duneinsolite.exception.InvalidReviewPlatformException;
import com.camping.duneinsolite.mapper.ExternalReviewMapperImpl;
import com.camping.duneinsolite.model.ExternalReview;
import com.camping.duneinsolite.model.ReviewPlatform;
import com.camping.duneinsolite.repository.ExternalReviewRepository;
import com.camping.duneinsolite.repository.ReviewPlatformRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExternalReviewServiceImplTest {

    private ExternalReviewRepository repository;
    private ReviewPlatformRepository platformRepository;
    private ExternalReviewServiceImpl service;

    private final ReviewPlatform google = ReviewPlatform.builder()
            .platformId(UUID.randomUUID()).name("Google").color("#4285F4").sourceKey("google").build();

    @BeforeEach
    void setUp() {
        repository = mock(ExternalReviewRepository.class);
        platformRepository = mock(ReviewPlatformRepository.class);
        when(repository.save(any(ExternalReview.class))).thenAnswer(inv -> inv.getArgument(0));
        when(platformRepository.findById(google.getPlatformId())).thenReturn(Optional.of(google));
        when(platformRepository.findByNameIgnoreCase(any())).thenReturn(Optional.empty());
        when(platformRepository.save(any(ReviewPlatform.class))).thenAnswer(inv -> inv.getArgument(0));
        service = new ExternalReviewServiceImpl(repository, platformRepository, new ExternalReviewMapperImpl());
    }

    private ExternalReviewRequest request() {
        ExternalReviewRequest r = new ExternalReviewRequest();
        r.setAuthorName("Marie-Paule");
        r.setRating(5);
        r.setReviewDate(LocalDate.of(2026, 9, 1));
        r.setBody("Une expérience extraordinaire dans le désert !");
        r.setPlatformId(google.getPlatformId());
        return r;
    }

    @Test
    void createDefaultsToPublishedAndKeepsTheTextExactlyAsEntered() {
        ExternalReviewRequest r = request();
        r.setBody("  Texte   d'origine, sans retouche.  ");

        ExternalReviewResponse saved = service.create(r);

        assertThat(saved.isPublished()).isTrue();
        assertThat(saved.getBody()).isEqualTo("  Texte   d'origine, sans retouche.  ");
        assertThat(saved.getPlatformName()).isEqualTo("Google");
        assertThat(saved.getPlatformColor()).isEqualTo("#4285F4");
    }

    @Test
    void createStoresBlankOptionalFieldsAsNullAndDropsAnOrphanReplyDate() {
        ExternalReviewRequest r = request();
        r.setCountry("  ");
        r.setTripType("");
        r.setOwnerReply(" ");
        r.setOwnerReplyDate(LocalDate.of(2026, 9, 2));

        ExternalReviewResponse saved = service.create(r);

        assertThat(saved.getCountry()).isNull();
        assertThat(saved.getTripType()).isNull();
        assertThat(saved.getOwnerReply()).isNull();
        assertThat(saved.getOwnerReplyDate()).isNull();
    }

    @Test
    void aNewPlatformIsCreatedWithItsOwnColourWhenNoneIsChosen() {
        ExternalReviewRequest r = request();
        r.setPlatformId(null);
        r.setNewPlatformName("  Viator ");
        r.setNewPlatformColor("#7B2CBF");

        ExternalReviewResponse saved = service.create(r);

        assertThat(saved.getPlatformName()).isEqualTo("Viator");
        assertThat(saved.getPlatformColor()).isEqualTo("#7B2CBF");
        verify(platformRepository).save(any(ReviewPlatform.class));
    }

    @Test
    void aNewPlatformWithoutAColourGetsTheNeutralDefault() {
        ExternalReviewRequest r = request();
        r.setPlatformId(null);
        r.setNewPlatformName("Viator");

        assertThat(service.create(r).getPlatformColor()).isEqualTo(ReviewPlatform.DEFAULT_COLOR);
    }

    @Test
    void aNewPlatformNameThatAlreadyExistsIsReusedNotDuplicated() {
        when(platformRepository.findByNameIgnoreCase("google")).thenReturn(Optional.of(google));
        ExternalReviewRequest r = request();
        r.setPlatformId(null);
        r.setNewPlatformName("google");
        r.setNewPlatformColor("#000000");

        ExternalReviewResponse saved = service.create(r);

        assertThat(saved.getPlatformColor()).isEqualTo("#4285F4");
        verify(platformRepository, never()).save(any(ReviewPlatform.class));
    }

    @Test
    void aReviewWithNoPlatformAtAllIsRejected() {
        ExternalReviewRequest r = request();
        r.setPlatformId(null);
        r.setNewPlatformName("   ");

        assertThatThrownBy(() -> service.create(r)).isInstanceOf(InvalidReviewPlatformException.class);
    }

    @Test
    void publishedReviewsAreExposedInThePublicWireShapeWithTheirPlatformColour() {
        ReviewPlatform viator = ReviewPlatform.builder()
                .platformId(UUID.randomUUID()).name("Viator").color("#7B2CBF").sourceKey(null).build();
        ExternalReview review = ExternalReview.builder()
                .externalReviewId(UUID.randomUUID())
                .authorName("Adeline")
                .rating(5)
                .reviewDate(LocalDate.of(2026, 3, 15))
                .body("Un endroit absolument magnifique !")
                .platform(viator)
                .tripType("Vacances · Famille")
                .ownerReply("Merci beaucoup pour ce superbe retour")
                .ownerReplyDate(LocalDate.of(2026, 3, 16))
                .published(true)
                .build();
        when(repository.findByPublishedTrueOrderByReviewDateDescCreatedAtDesc()).thenReturn(List.of(review));

        List<PublicReviewResponse> out = service.getPublished();

        assertThat(out).hasSize(1);
        PublicReviewResponse p = out.get(0);
        assertThat(p.getId()).isEqualTo(review.getExternalReviewId().toString());
        assertThat(p.getName()).isEqualTo("Adeline");
        assertThat(p.getDate()).isEqualTo("2026-03-15");
        // A platform staff added has no built-in key: reported as "other".
        assertThat(p.getSource()).isEqualTo("other");
        assertThat(p.getPlatformName()).isEqualTo("Viator");
        assertThat(p.getPlatformColor()).isEqualTo("#7B2CBF");
        assertThat(p.getTripType()).isEqualTo("Vacances · Famille");
        assertThat(p.getOwnerReplyDate()).isEqualTo("2026-03-16");
        assertThat(p.getActivitySlug()).isNull();
    }

    @Test
    void aBuiltInPlatformKeepsItsKnownSourceKey() {
        ExternalReview review = ExternalReview.builder()
                .externalReviewId(UUID.randomUUID())
                .authorName("Hélène")
                .rating(5)
                .reviewDate(LocalDate.of(2026, 7, 1))
                .body("Une expérience absolument inoubliable !")
                .platform(google)
                .published(true)
                .build();
        when(repository.findByPublishedTrueOrderByReviewDateDescCreatedAtDesc()).thenReturn(List.of(review));

        assertThat(service.getPublished().get(0).getSource()).isEqualTo("google");
    }
}
