package com.camping.duneinsolite.dto.response;

import lombok.Data;
import java.util.UUID;

@Data
public class SourceResponse {
    private UUID sourceId;
    private String name;
}