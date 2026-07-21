package com.camping.duneinsolite.dto.request;

import com.camping.duneinsolite.model.enums.UserRole;
import lombok.Data;

@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private String phone;
    private UserRole role; // CLIENT, PARTENAIRE, CAMPING, ADMIN

    // Only relevant when role = PARTENAIRE
    private String matriculeFiscal;
    private String agencyAddress;
}