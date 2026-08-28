package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.CompanyType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class MediaAssetResponse {
    private UUID assetId;
    private String filename;
    private String mimeType;
    private Long sizeBytes;
    /** Where to fetch the actual bytes — see WebConfig's /media/** mapping. */
    private String url;
    private CompanyType companyType;
    private LocalDateTime createdAt;
}
