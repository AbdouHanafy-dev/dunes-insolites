package com.camping.duneinsolite.controller;



import com.camping.duneinsolite.dto.request.LoginRequest;
import com.camping.duneinsolite.dto.request.RefreshRequest;
import com.camping.duneinsolite.dto.request.RegisterRequest;
import com.camping.duneinsolite.dto.response.LoginResponse;
import com.camping.duneinsolite.dto.response.UserResponse;
import com.camping.duneinsolite.mapper.UserMapper;
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
    private final UserMapper userMapper;

    /**
     * POST /api/auth/register
     * Public self-registration. Creates the user in Keycloak + the local DB.
     * Body: { name, email, password, phone }
     *
     * The role is NOT taken from the request — this endpoint is permitAll(),
     * so self-registration is always CLIENT. Staff and partner accounts are
     * created through POST /api/users/add, behind hasRole('ADMIN').
     *
     * Returns UserResponse, not the User entity (CLAUDE.md: "Entities never
     * cross the controller boundary. AuthController.register still returns
     * User; that is a known violation, not a precedent" — fixed). UserMapper
     * already existed and is used elsewhere in this file; it just wasn't
     * wired in here. frontend/app/api/auth/register/route.ts's fallback
     * path already reads `data.userId`, which UserResponse carries under
     * the same field name, so this is a same-shape fix, not a breaking one.
     */
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@RequestBody RegisterRequest request) {
        User createdUser = keycloakUserSyncService.registerUser(request, UserRole.CLIENT);
        return ResponseEntity.status(HttpStatus.CREATED).body(userMapper.toResponse(createdUser));
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
