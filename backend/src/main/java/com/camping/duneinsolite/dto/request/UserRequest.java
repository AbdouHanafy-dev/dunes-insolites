package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.UserRole;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class UserRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    // Password is optional here - if blank, a random one is generated
    // (admin flow) or the field is simply unused. @Size(min=8) alone 400s
    // on "" (found live: creating any staff account through the admin UI
    // with its password field left blank - exactly what its own "vide =
    // généré automatiquement" hint tells the admin to do), since @Size
    // only exempts null, not blank. Only enforce the minimum when a real
    // password was actually typed.
    @Pattern(regexp = "^$|.{8,}$", message = "Password must be at least 8 characters")
    private String password;

    private String phone;

    @NotNull(message = "Role is required")
    private UserRole role;

    // Only relevant when role = STAFF — must name an existing CustomRole.
    private String customRoleName;

    // Only relevant when role = PARTENAIRE
    private String matriculeFiscal;
    private String agencyAddress;

    private Boolean hasSpecialRemise;
    private List<UserProductRemiseRequest> remises;
}