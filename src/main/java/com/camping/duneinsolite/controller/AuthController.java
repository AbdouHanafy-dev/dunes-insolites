package com.camping.duneinsolite.controller;



import com.camping.duneinsolite.dto.request.LoginRequest;
import com.camping.duneinsolite.dto.request.RefreshRequest;
import com.camping.duneinsolite.dto.request.RegisterRequest;
import com.camping.duneinsolite.dto.response.LoginResponse;
import com.camping.duneinsolite.dto.response.UserResponse;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.service.AuthService;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final KeycloakUserSyncService keycloakUserSyncService;
    private final AuthService authService;
    private final UserService userService;

    /**
     * POST /api/auth/register
     * Creates user in Keycloak + saves in local DB
     * Body: { name, email, password, phone, role, taxId?, commissionRate? }
     */
    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody RegisterRequest request) {
        User createdUser = keycloakUserSyncService.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
    }

    /**
     * POST /api/auth/login
     * Authenticates against Keycloak, returns JWT token
     * Body: { email, password }
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/auth/refresh
     * Exchanges a refresh token for a new access + refresh token pair.
     * Body: { refreshToken }
     */
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@RequestBody RefreshRequest request) {
        LoginResponse response = authService.refresh(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/clients-partenaires")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAMPING')")
    public ResponseEntity<List<UserResponse>> getClientsAndPartenaires() {
        List<UserResponse> users = userService.getUsersByRoles(
                List.of(UserRole.CLIENT, UserRole.PARTENAIRE)
        );
        return ResponseEntity.ok(users);
    }
}
