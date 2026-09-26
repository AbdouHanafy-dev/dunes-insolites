package com.camping.duneinsolite.service;

import java.util.Map;

/** The site's booking-form wording as edited in the back office, layered over the texts shipped with the site. */
public interface SiteTextService {

    /** language -> (message key -> text). Only what was overridden. */
    Map<String, Map<String, String>> all();

    /** Sets the wording, or removes the override (site text back) when {@code value} is blank. */
    void set(String locale, String key, String value);
}
