package com.camping.duneinsolite.dto.response;

import com.camping.duneinsolite.model.enums.LoyaltyTier;
import com.camping.duneinsolite.model.enums.UserRole;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class UserResponse {
    private UUID userId;
    private String name;
    private String email;
    private String phone;
    private UserRole role;

    // CLIENT-only
    private Integer loyaltyPoints;
    private LoyaltyTier loyaltyTier;

    // PARTENAIRE-only
    private String matriculeFiscal;
    private String agencyAddress;

    private Boolean hasSpecialRemise;
    private List<UserProductRemiseResponse> remises;
}