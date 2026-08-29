package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.UserRequest;
import com.camping.duneinsolite.dto.response.UserResponse;
import com.camping.duneinsolite.model.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface UserService {
    UserResponse createUser(UserRequest request);
    UserResponse getUserById(UUID userId);
    UserResponse getUserByEmail(String email);
    Page<UserResponse> getAllUsers(Pageable pageable);
    UserResponse updateUser(UUID userId, UserRequest request);
    void deleteUser(UUID userId);
    List<UserResponse> getUsersByRoles(List<UserRole> roles);
    Page<UserResponse> searchUsers(List<UserRole> roles, String term, Pageable pageable);
}
