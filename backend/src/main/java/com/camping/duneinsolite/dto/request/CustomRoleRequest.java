package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CustomRoleRequest {

    // Doubles as the Keycloak realm role name (KeycloakUserSyncService's
    // existing generic assignRole/removeRole) - restricted to a safe,
    // stable identifier rather than free text, same reasoning as any other
    // machine-readable slug in this codebase.
    @NotBlank(message = "Le nom est requis")
    @Pattern(regexp = "^[A-Z][A-Z0-9_]{1,63}$",
             message = "Majuscules, chiffres et underscore uniquement, doit commencer par une lettre")
    private String name;

    @NotBlank(message = "Le libellé est requis")
    private String label;
}
