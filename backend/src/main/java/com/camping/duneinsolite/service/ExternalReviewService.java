package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.ExternalReviewRequest;
import com.camping.duneinsolite.dto.response.ExternalReviewResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicReviewResponse;

import java.util.List;
import java.util.UUID;

public interface ExternalReviewService {

    ExternalReviewResponse create(ExternalReviewRequest request);

    ExternalReviewResponse update(UUID externalReviewId, ExternalReviewRequest request);

    void delete(UUID externalReviewId);

    List<ExternalReviewResponse> getAll();

    /** Published reviews only, newest first, in the public wire shape. */
    List<PublicReviewResponse> getPublished();
}
