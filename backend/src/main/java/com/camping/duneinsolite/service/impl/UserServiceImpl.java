package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.UserRequest;
import com.camping.duneinsolite.dto.response.UserResponse;
import com.camping.duneinsolite.exception.EmailAlreadyInUseException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.exception.UserNotFoundException;
import com.camping.duneinsolite.mapper.UserMapper;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.LoyaltyTier;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final KeycloakUserSyncService keycloakUserSyncService;


    @Override
    public UserResponse createUser(UserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyInUseException(request.getEmail());
        }
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(request.getRole())
                .loyaltyPoints(0)
                .loyaltyTier(LoyaltyTier.BRONZE)
                .matriculeFiscal(request.getRole() == UserRole.PARTENAIRE ? request.getMatriculeFiscal() : null)
                .agencyAddress(request.getRole()   == UserRole.PARTENAIRE ? request.getAgencyAddress()   : null)
                .build();
        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID userId) {
        return userMapper.toResponse(findUserById(userId));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        return userMapper.toResponse(
                userRepository.findByEmail(email)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email))
        );
    }

    // Was an unbounded findAll() (ARCHITECTURE.md §13 item 15). The admin
    // app doesn't call this one at all - it uses searchUsers below, already
    // paginated - so this had no real caller to coordinate with either.
    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(userMapper::toResponse);
    }
    @Override
    public UserResponse updateUser(UUID userId, UserRequest request) {
        User updatedUser = keycloakUserSyncService.updateUser(userId, request);
        return userMapper.toResponse(updatedUser);
    }


    @Override
    public void deleteUser(UUID userId) {
        userRepository.delete(findUserById(userId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getUsersByRoles(List<UserRole> roles) {
        return userRepository.findByRoleIn(roles).stream()
                .map(userMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsers(List<UserRole> roles, String term, Pageable pageable) {
        String safeTerm = term == null ? "" : term.trim();
        return userRepository.searchByRolesAndTerm(roles, safeTerm, pageable)
                .map(userMapper::toResponse);
    }

    private User findUserById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }
}