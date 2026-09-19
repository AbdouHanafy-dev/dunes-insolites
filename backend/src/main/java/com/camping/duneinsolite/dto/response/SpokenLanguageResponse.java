package com.camping.duneinsolite.dto.response;

import lombok.Data;
import java.util.UUID;

@Data
public class SpokenLanguageResponse {
    private UUID languageId;
    private String name;
    private Boolean active;
}
