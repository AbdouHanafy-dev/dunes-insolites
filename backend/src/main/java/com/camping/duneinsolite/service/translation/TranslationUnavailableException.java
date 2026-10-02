package com.camping.duneinsolite.service.translation;

import com.camping.duneinsolite.exception.ExternalServiceException;

/** The translation provider was unreachable, rate-limited or returned something unusable. */
public class TranslationUnavailableException extends ExternalServiceException {
    public TranslationUnavailableException(Throwable cause) {
        super("Automatic translation", cause);
    }
}
