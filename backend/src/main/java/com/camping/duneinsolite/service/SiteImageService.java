package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.SiteImageResponse;

import java.util.List;
import java.util.Map;

public interface SiteImageService {

    /** Every slot support has replaced. */
    List<SiteImageResponse> getAll();

    /** slot key to photo address, for the public site. */
    Map<String, String> getPublicMap();

    SiteImageResponse set(String key, String url);

    /** Back to the site's built-in photo. Removing a slot that was never set is not an error. */
    void reset(String key);
}
