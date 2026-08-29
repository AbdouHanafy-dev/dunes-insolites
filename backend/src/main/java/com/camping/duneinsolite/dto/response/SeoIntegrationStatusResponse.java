package com.camping.duneinsolite.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SeoIntegrationStatusResponse {
    private boolean analyticsConfigured;
    private boolean searchConsoleConfigured;
}
