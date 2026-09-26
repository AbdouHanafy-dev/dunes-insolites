package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.response.ReservationTourTypeResponse;
import com.camping.duneinsolite.model.ReservationAccommodation;
import com.camping.duneinsolite.model.ReservationTourType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationTourTypeMapperTest {

    private final ReservationTourTypeMapper mapper = new ReservationTourTypeMapperImpl();

    @Test
    void aStayLineCarriesItsTiersAndNightsToTheBackOffice() {
        ReservationTourType stay = new ReservationTourType();
        stay.setName("Une nuit à Dunes Insolites");
        stay.setNumberOfAdults(3);
        stay.setNumberOfChildren(1);
        stay.setNumberOfInfants(1);
        stay.setNumberOfNights(2);
        ReservationAccommodation suite = new ReservationAccommodation();
        suite.setAccommodationName("Dune Suite");
        suite.setAccommodationUnits(2);
        suite.setAdults(3);
        suite.setChildren(1);
        stay.setAccommodations(List.of(suite));

        ReservationTourTypeResponse response = mapper.toResponse(stay);

        assertThat(response.getNumberOfNights()).isEqualTo(2);
        assertThat(response.getNumberOfAdults()).isEqualTo(3);
        assertThat(response.getAccommodations()).singleElement().satisfies(tier -> {
            assertThat(tier.getAccommodationName()).isEqualTo("Dune Suite");
            assertThat(tier.getAccommodationUnits()).isEqualTo(2);
            assertThat(tier.getAdults()).isEqualTo(3);
        });
    }
}
