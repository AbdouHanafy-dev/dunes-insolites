package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.CompanyType;
import com.camping.duneinsolite.model.enums.NavMenuType;
import com.camping.duneinsolite.model.enums.PageLocale;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class NavigationItemRequest {

    @NotBlank(message = "Label is required")
    private String label;

    @NotBlank(message = "URL is required")
    private String url;

    @NotNull(message = "Locale is required")
    private PageLocale locale;

    @NotNull(message = "Company is required")
    private CompanyType companyType;

    private Integer displayOrder;

    private NavMenuType menuType;
}
