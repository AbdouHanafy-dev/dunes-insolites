package com.camping.duneinsolite.exception;

import org.springframework.http.HttpStatus;

/** A page with this slug already exists for this locale + company. */
public class PageSlugConflictException extends BusinessException {
    public PageSlugConflictException(String slug) {
        super(HttpStatus.CONFLICT, "A page with slug \"" + slug + "\" already exists for this locale and company.");
    }
}
