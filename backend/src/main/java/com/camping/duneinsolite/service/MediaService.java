package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.MediaAssetResponse;
import com.camping.duneinsolite.model.enums.CompanyType;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface MediaService {
    MediaAssetResponse upload(MultipartFile file, CompanyType companyType);
    List<MediaAssetResponse> getAllAssets();
    void deleteAsset(UUID assetId);
}
