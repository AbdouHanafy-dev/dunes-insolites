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

    // Password is optional here — if null, a random one is generated (admin flow)
    @Size(min = 8, message = "Password must be at least 8 characters")
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