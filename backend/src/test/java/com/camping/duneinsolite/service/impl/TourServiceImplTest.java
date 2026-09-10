package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.TourUpdateRequest;
import com.camping.duneinsolite.mapper.TourMapper;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.repository.ReviewRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.UserProductRemiseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
    private TourServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(TourRepository.class);
        TourMapper mapper = mock(TourMapper.class);
        UserProductRemiseRepository remiseRepository = mock(UserProductRemiseRepository.class);
        ReviewRepository reviewRepository = mock(ReviewRepository.class);

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

        service = new TourServiceImpl(repository, mapper, remiseRepository, reviewRepository);
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
}
