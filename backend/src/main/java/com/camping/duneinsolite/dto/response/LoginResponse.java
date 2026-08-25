package com.camping.duneinsolite.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private long expiresIn;
    private String tokenType;

    private String userId;
    private String email;
    private String name;
}
