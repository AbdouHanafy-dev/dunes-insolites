package com.camping.duneinsolite.service;

import com.camping.duneinsolite.model.User;

public interface AccountActionService {

    /** Issues a fresh verify-email token and emails the link. Called right after registration. */
    void sendVerificationEmail(User user);

    /**
     * Public entry point for "forgot password". Deliberately silent about
     * whether the email exists — the caller always gets the same response
     * either way (see AuthController), this method just no-ops when it
     * doesn't find a match.
     */
    void requestPasswordReset(String email);

    /** Sends a 24-hour, one-use link so an admin-created driver chooses their own password. */
    void sendPasswordSetupInvitation(User user);

    /** Sends a one-use setup link for an account created during guest checkout. */
    void sendGuestPasswordSetupInvitation(User user);

    /** Redeems an EMAIL_VERIFY token and marks the account verified in Keycloak. */
    void verifyEmail(String token);

    /** Redeems a PASSWORD_RESET token and sets the new password in Keycloak. */
    void resetPassword(String token, String newPassword);
}
