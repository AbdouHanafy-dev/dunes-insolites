// exception/KeycloakSyncException.java
package com.camping.duneinsolite.exception;

public class KeycloakSyncException extends RuntimeException {
    public KeycloakSyncException(String message, Throwable cause) {
        super(message, cause);
    }
    public KeycloakSyncException(String message) {
        super(message);
    }
}