package com.camping.duneinsolite.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * What the back office sets on a booked circuit: the free-text return city and the paid options
 * (upgrades). Prices are never sent - the server prices every line from the catalogue.
 */
@Data
public class CircuitOptionsRequest {

    /** A return city outside the list; null or blank clears it (and drops its paid option). */
    @Size(max = 120)
    private String returnCityOther;

    @Valid
    private List<Item> options = List.of();

    @Data
    public static class Item {
        @NotNull
        private UUID extraId;

        /** Nights the option covers; only read by per-person-per-night options. */
        @Min(1)
        @Max(60)
        private Integer nights;
    }
}
