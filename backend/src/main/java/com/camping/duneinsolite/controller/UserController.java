package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.UserRequest;
import com.camping.duneinsolite.dto.response.UserResponse;
import com.camping.duneinsolite.mapper.UserMapper;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final KeycloakUserSyncService keycloakUserSyncService;
    private final UserMapper userMapper;


    // Every endpoint below used to be a bare hasRole('ADMIN')/hasAnyRole('ADMIN')
    // literal - USERS is a fully ADMIN-only resource today with no CAMPING/
    // PARTENAIRE mix at all, so routing it through the permission matrix is a
    // zero-behavior-change conversion: CAMPING/PARTENAIRE seed at NONE (see
    // RolePermissionSeeder), exactly matching what they could do before.
    @PostMapping("/add")
    @PreAuthorize("@perm.can('USERS', 'FULL')")
    public ResponseEntity<UserResponse> adminAddUser(@Valid @RequestBody UserRequest request) {
        User created = keycloakUserSyncService.adminCreateUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(userMapper.toResponse(created));
    }


    @PostMapping
    @PreAuthorize("@perm.can('USERS', 'FULL')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @GetMapping("/{userId}")
    @PreAuthorize("@perm.can('USERS', 'READ')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID userId) {
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @GetMapping
    @PreAuthorize("@perm.can('USERS', 'READ')")
    public ResponseEntity<Page<UserResponse>> getAllUsers(@PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(userService.getAllUsers(pageable));
    }


    @GetMapping("/search")
    @PreAuthorize("@perm.can('USERS', 'READ')")
    public ResponseEntity<Page<UserResponse>> searchUsers(
            @RequestParam(required = false) List<UserRole> roles,
            @RequestParam(required = false) String term,
            @PageableDefault(size = 10) Pageable pageable) {
        List<UserRole> effectiveRoles = (roles == null || roles.isEmpty())
                ? List.of(UserRole.CLIENT, UserRole.PARTENAIRE)
                : roles;
        return ResponseEntity.ok(userService.searchUsers(effectiveRoles, term, pageable));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("@perm.can('USERS', 'EDIT')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable UUID userId,
                                                   @Valid @RequestBody UserRequest request) {
        return ResponseEntity.ok(userService.updateUser(userId, request));
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("@perm.can('USERS', 'FULL')")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID userId) {
        keycloakUserSyncService.deleteUser(userId); // deletes from Keycloak + DB
        return ResponseEntity.noContent().build();
    }
}