package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.ReviewPlatformRequest;
import com.camping.duneinsolite.dto.response.ReviewPlatformResponse;

import java.util.List;
import java.util.UUID;

public interface ReviewPlatformService {

    List<ReviewPlatformResponse> getAll();

    ReviewPlatformResponse create(ReviewPlatformRequest request);

    ReviewPlatformResponse update(UUID platformId, ReviewPlatformRequest request);

    /** Refused with a conflict while any review still uses the platform. */
    void delete(UUID platformId);
}
