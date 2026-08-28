package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.NavMenuType;
import com.camping.duneinsolite.model.enums.PageLocale;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NavigationItemResponse {
    private UUID navItemId;
    private String label;
    private String url;
    private PageLocale locale;
    private CompanyType companyType;
    private Integer displayOrder;
    private NavMenuType menuType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
