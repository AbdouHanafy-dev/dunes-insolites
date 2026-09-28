package com.camping.duneinsolite.mapper.publicapi;

import com.camping.duneinsolite.model.AccommodationType;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.repository.AccommodationTypeRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PublicStayMapperTest {

    private final AccommodationTypeRepository repository = mock(AccommodationTypeRepository.class);
    private final PublicStayMapper mapper = new PublicStayMapper(repository);

    @Test
    void exposesActiveUnpricedBivouacTentAsInformationalContent() {
        UUID stayId = UUID.randomUUID();
        TourType bivouac = stay(stayId, "bivouac-desert-tunisie", false);
        AccommodationType tent = AccommodationType.builder()
                .tourType(bivouac)
                .slug("simple-camping-tent")
                .name("Tente de camping simple")
                .description("La tente utilisée pendant le bivouac.")
                .capacity(4)
                .active(true)
                .build();
        when(repository.findByTourType_TourTypeIdOrderByDisplayOrderAsc(stayId))
                .thenReturn(List.of(tent));

        var response = mapper.toResponse(bivouac, "fr");

        assertThat(response.getAccommodations()).hasSize(1);
        assertThat(response.getAccommodations().getFirst().getSlug()).isEqualTo("simple-camping-tent");
        assertThat(response.getAccommodations().getFirst().getPriceFrom()).isEqualByComparingTo("70.00");
    }

    @Test
    void keepsUnpricedTierHiddenForRegularStay() {
        UUID stayId = UUID.randomUUID();
        TourType camp = stay(stayId, "nuitee-campement-desert", true);
        AccommodationType unpriced = AccommodationType.builder()
                .tourType(camp)
                .slug("unpriced-room")
                .name("Unpriced room")
                .capacity(2)
                .active(true)
                .build();
        when(repository.findByTourType_TourTypeIdOrderByDisplayOrderAsc(stayId))
                .thenReturn(List.of(unpriced));

        assertThat(mapper.toResponse(camp, "fr").getAccommodations()).isEmpty();
    }

    private static TourType stay(UUID id, String slug, boolean hasAccommodationTypes) {
        return TourType.builder()
                .tourTypeId(id)
                .slug(slug)
                .name("Stay")
                .description("Description")
                .hasAccommodationTypes(hasAccommodationTypes)
                .passengerAdultPrice(new BigDecimal("70.00"))
                .passengerChildPrice(new BigDecimal("40.00"))
                .partnerAdultPrice(new BigDecimal("70.00"))
                .partnerChildPrice(new BigDecimal("40.00"))
                .build();
    }
}
