package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.FavoriteType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteResponse {
    private FavoriteType type;
    private String slug;
    private LocalDateTime createdAt;
}
