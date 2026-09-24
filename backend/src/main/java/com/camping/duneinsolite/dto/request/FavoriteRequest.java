package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.FavoriteType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FavoriteRequest {

    @NotNull(message = "Le type est requis")
    private FavoriteType type;

    @NotNull(message = "L'identifiant est requis")
    @Size(max = 160, message = "L'identifiant doit faire 160 caractères au plus")
    private String slug;
}
