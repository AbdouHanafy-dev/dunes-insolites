package com.camping.duneinsolite.dto.request;

import lombok.Data;

/**
 * Public self-registration payload.
 *
 * There is deliberately no `role` field. The role is decided by the server —
 * AuthController always registers a CLIENT — because this endpoint is
 * permitAll(), and a caller-supplied role here meant anyone on the internet
 * could POST {"role":"ADMIN"} and be granted a Keycloak realm admin account.
 *
 * Privileged accounts are created only through POST /api/users/add, which is
 * behind hasRole('ADMIN').
 */
@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private String phone;
    // The site language the visitor signed up in (fr, en, de, it, da, ar); picks the language of the
    // account emails. Optional - anything missing or unknown is French.
    private String locale;

    // Required (server-enforced, not just a frontend checkbox) when this
    // request results in a CLIENT account — see
    // KeycloakUserSyncService.registerUser. Defaults to false when the
    // field is omitted, which is the correct fail-closed behavior: a
    // caller that doesn't send it doesn't get to skip consent.
    private boolean acceptedTerms;

    // Only relevant when the server registers a PARTENAIRE (not via self-registration)
    private String matriculeFiscal;
    private String agencyAddress;
}