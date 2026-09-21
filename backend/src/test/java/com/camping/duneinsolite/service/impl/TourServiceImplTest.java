package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.TourRequest;
import com.camping.duneinsolite.dto.request.TourUpdateRequest;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ProductIncompleteException;
import com.camping.duneinsolite.mapper.TourMapper;
import com.camping.duneinsolite.mapper.publicapi.PublicTourMapper;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.enums.ProductStatus;
import com.camping.duneinsolite.repository.ReviewRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.UserProductRemiseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Found live, verified live (a full CRUD audit run against the real
 * backend), regression-tested here: TourMapper.updateEntity has no
 * NullValuePropertyMappingStrategy.IGNORE (confirmed against the real
 * generated mapper, not assumed), so a PUT that omits isActive - legitimate,
 * since TourUpdateRequest doesn't require it - overwrote the entity's field
 * with null, which tours.is_active's NOT NULL constraint then rejected with
 * a raw SQL-error 400. Same bug class as PageServiceImplTest's
 * noIndex/noFollow/status, found by sweeping every mapper with the same
 * missing-IGNORE shape after this one turned up. TourTypeServiceImpl and
 * ExtraServiceImpl and MaintenanceWindowServiceImpl got the identical fix,
 * verified live the same way - not duplicated here as its own test class
 * since the shape is identical.
 */
class TourServiceImplTest {

    private TourRepository repository;
    private TourMapper mapper;
    private SpokenLanguageResolver spokenLanguageResolver;
    private TourServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(TourRepository.class);
        mapper = mock(TourMapper.class);
        PublicTourMapper publicTourMapper = mock(PublicTourMapper.class);
        UserProductRemiseRepository remiseRepository = mock(UserProductRemiseRepository.class);
        ReviewRepository reviewRepository = mock(ReviewRepository.class);
        spokenLanguageResolver = mock(SpokenLanguageResolver.class);

        // Reproduces the real mapper's overwrite-with-null behavior.
        doAnswer(inv -> {
            TourUpdateRequest r = inv.getArgument(0);
            Tour target = inv.getArgument(1);
            target.setName(r.getName());
            target.setDescription(r.getDescription());
            target.setPassengerAdultPrice(r.getPassengerAdultPrice());
            target.setIsActive(r.getIsActive());
            return null;
        }).when(mapper).updateEntity(any(TourUpdateRequest.class), any(Tour.class));

        when(repository.save(any(Tour.class))).thenAnswer(inv -> inv.getArgument(0));

        service = new TourServiceImpl(repository, mapper, publicTourMapper, remiseRepository, reviewRepository, spokenLanguageResolver);
    }

    @Test
    void updatePreservesIsActiveWhenRequestOmitsIt() {
        UUID tourId = UUID.randomUUID();
        Tour existing = Tour.builder()
                .tourId(tourId)
                .name("Old name")
                .isActive(false) // deactivated - the case that must not flip back
                .build();
        when(repository.findById(tourId)).thenReturn(Optional.of(existing));

        TourUpdateRequest request = new TourUpdateRequest();
        request.setName("New name");
        request.setPassengerAdultPrice(new java.math.BigDecimal("100.0"));
        request.setPassengerChildPrice(new java.math.BigDecimal("50.0"));
        request.setPartnerAdultPrice(new java.math.BigDecimal("80.0"));
        request.setPartnerChildPrice(new java.math.BigDecimal("40.0"));
        request.setTva(new java.math.BigDecimal("13.0"));
        // isActive left null - a PUT that only touches content/pricing.

        service.updateTour(tourId, request);

        assertThat(existing.getName()).isEqualTo("New name");
        assertThat(existing.getIsActive()).isFalse();
    }

    private Tour completeTour() {
        return Tour.builder()
                .tourId(UUID.randomUUID())
                .name("Sahara circuit")
                .description("A great circuit")
                .keywords(List.of("desert"))
                .programSteps(List.of(new ProgramStep("Jour 1", "Depart", "desc")))
                .coverPhotoUrl("cover.jpg")
                .photos(List.of(new Photo("p1.jpg", null), new Photo("p2.jpg", null), new Photo("p3.jpg", null)))
                .copyrightConfirmed(true)
                .insuranceConfirmed(true)
                .complianceConfirmed(true)
                .passengerAdultPrice(new java.math.BigDecimal("100"))
                .passengerChildPrice(new java.math.BigDecimal("50"))
                .partnerAdultPrice(new java.math.BigDecimal("80"))
                .partnerChildPrice(new java.math.BigDecimal("40"))
                .tva(new java.math.BigDecimal("13"))
                .status(ProductStatus.DRAFT)
                .build();
    }

    @Test
    void submitForReviewRejectsIncompleteTour() {
        UUID tourId = UUID.randomUUID();
        Tour existing = Tour.builder().tourId(tourId).name("Bare tour").status(ProductStatus.DRAFT).build();
        when(repository.findById(tourId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.submitForReview(tourId))
                .isInstanceOf(ProductIncompleteException.class);
        assertThat(existing.getStatus()).isEqualTo(ProductStatus.DRAFT);
    }

    @Test
    void submitForReviewMovesCompleteTourToInReview() {
        Tour existing = completeTour();
        when(repository.findById(existing.getTourId())).thenReturn(Optional.of(existing));

        service.submitForReview(existing.getTourId());

        assertThat(existing.getStatus()).isEqualTo(ProductStatus.IN_REVIEW);
    }

    @Test
    void approveRequiresInReviewAndPublishes() {
        Tour existing = completeTour();
        existing.setStatus(ProductStatus.IN_REVIEW);
        existing.setIsActive(false);
        when(repository.findById(existing.getTourId())).thenReturn(Optional.of(existing));

        service.approveTour(existing.getTourId());

        assertThat(existing.getStatus()).isEqualTo(ProductStatus.PUBLISHED);
        assertThat(existing.getIsActive()).isTrue();
    }

    @Test
    void approveRejectsTourNotInReview() {
        Tour existing = completeTour();
        when(repository.findById(existing.getTourId())).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.approveTour(existing.getTourId()))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void rejectRequiresInReviewAndStoresReason() {
        Tour existing = completeTour();
        existing.setStatus(ProductStatus.IN_REVIEW);
        existing.setIsActive(true);
        when(repository.findById(existing.getTourId())).thenReturn(Optional.of(existing));

        service.rejectTour(existing.getTourId(), "Photos too dark");

        assertThat(existing.getStatus()).isEqualTo(ProductStatus.REJECTED);
        assertThat(existing.getIsActive()).isFalse();
        assertThat(existing.getRejectionReason()).isEqualTo("Photos too dark");
    }

    @Test
    void createTourAlwaysStartsDraft() {
        TourRequest request = new TourRequest();
        request.setName("New tour");
        request.setPassengerAdultPrice(new java.math.BigDecimal("100"));
        request.setPassengerChildPrice(new java.math.BigDecimal("50"));
        request.setPartnerAdultPrice(new java.math.BigDecimal("80"));
        request.setPartnerChildPrice(new java.math.BigDecimal("40"));
        request.setTva(new java.math.BigDecimal("13"));

        when(repository.existsByName("New tour")).thenReturn(false);
        Tour mapped = Tour.builder().name("New tour").status(ProductStatus.PUBLISHED).build();
        when(mapper.toEntity(request)).thenReturn(mapped);
        when(spokenLanguageResolver.resolve(null)).thenReturn(java.util.Set.of());

        service.createTour(request);

        assertThat(mapped.getStatus()).isEqualTo(ProductStatus.DRAFT);
    }
}
