package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.RedirectRequest;
import com.camping.duneinsolite.dto.response.RedirectResponse;

import java.util.List;
import java.util.UUID;

public interface RedirectService {
    RedirectResponse createRedirect(RedirectRequest request);
    RedirectResponse getRedirectById(UUID redirectId);
    List<RedirectResponse> getAllRedirects();
    RedirectResponse updateRedirect(UUID redirectId, RedirectRequest request);
    void deleteRedirect(UUID redirectId);

    /** Vitrine-facing: every active redirect, for the frontend's own middleware to match against. */
    List<RedirectResponse> getPublicRedirects();
}
