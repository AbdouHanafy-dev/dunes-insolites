package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.PageLocale;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ContentBlockResponse {
    private UUID blockId;
    private String label;
    private String type;
    private String dataJson;
    private PageLocale locale;
    private CompanyType companyType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
