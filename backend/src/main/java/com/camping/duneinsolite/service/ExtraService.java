package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.ExtraRequest;
import com.camping.duneinsolite.dto.response.ExtraResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicActivityResponse;
import java.util.List;
import java.util.UUID;

public interface ExtraService {
    ExtraResponse createExtra(ExtraRequest request);
    ExtraResponse getExtraById(UUID extraId);
    List<ExtraResponse> getAllExtras();
    List<ExtraResponse> getActiveExtras();
    ExtraResponse updateExtra(UUID extraId, ExtraRequest request);
    void deleteExtra(UUID extraId);
    ExtraResponse deactivateExtra(UUID extraId);

    // ── Public, vitrine-shaped reads (DI-012) ──────────────────────────
    List<PublicActivityResponse> getPublicActivities(String locale);
    PublicActivityResponse getPublicActivityBySlug(String slug, String locale);
}