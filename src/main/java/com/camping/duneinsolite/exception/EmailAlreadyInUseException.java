// exception/EmailAlreadyInUseException.java
package com.camping.duneinsolite.exception;

public class EmailAlreadyInUseException extends RuntimeException {
    public EmailAlreadyInUseException(String email) {
        super("Email is already in use by another account: " + email);
    }
}