package com.camping.duneinsolite.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/** The favourites a guest saved in the browser before logging in. */
@Data
public class FavoriteMergeRequest {

    @NotNull(message = "La liste est requise")
    @Size(max = 200, message = "Trop de favoris")
    private List<@Valid FavoriteRequest> items;
}
