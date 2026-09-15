package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.CustomRoleRequest;
import com.camping.duneinsolite.dto.response.CustomRoleResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.CustomRole;
import com.camping.duneinsolite.model.CustomRolePermission;
import com.camping.duneinsolite.model.enums.AdminResource;
import com.camping.duneinsolite.model.enums.PermissionLevel;
import com.camping.duneinsolite.repository.CustomRolePermissionRepository;
import com.camping.duneinsolite.repository.CustomRoleRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.CustomRoleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomRoleServiceImpl implements CustomRoleService {

    private final CustomRoleRepository customRoleRepository;
    private final CustomRolePermissionRepository customRolePermissionRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CustomRoleResponse> listAll() {
        return customRoleRepository.findAllByOrderByNameAsc().stream()
                .map(r -> new CustomRoleResponse(
                        r.getName(), r.getLabel(), r.getCreatedAt(),
                        userRepository.countByCustomRoleName(r.getName())))
                .toList();
    }

    @Override
    @Transactional
    public CustomRoleResponse create(CustomRoleRequest request) {
        if (customRoleRepository.existsById(request.getName())) {
            throw new ConflictException("Un rôle nommé \"" + request.getName() + "\" existe déjà.");
        }
        CustomRole saved = customRoleRepository.save(
                CustomRole.builder().name(request.getName()).label(request.getLabel()).build());
        log.info("Custom role created: {}", saved.getName());
        return new CustomRoleResponse(saved.getName(), saved.getLabel(), saved.getCreatedAt(), 0);
    }

    @Override
    @Transactional
    public void delete(String name) {
        getOrThrow(name);
        if (userRepository.existsByCustomRoleName(name)) {
            throw new ConflictException(
                    "Ce rôle est encore attribué à au moins un utilisateur — retirez-le d'abord.");
        }
        customRolePermissionRepository.deleteByCustomRoleName(name);
        customRoleRepository.deleteById(name);
        log.info("Custom role deleted: {}", name);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<AdminResource, PermissionLevel> getPermissions(String name) {
        getOrThrow(name);
        Map<AdminResource, PermissionLevel> row = new EnumMap<>(AdminResource.class);
        for (AdminResource resource : AdminResource.values()) {
            row.put(resource, customRolePermissionRepository
                    .findByCustomRoleNameAndResource(name, resource)
                    .map(CustomRolePermission::getLevel)
                    .orElse(PermissionLevel.NONE));
        }
        return row;
    }

    @Override
    @Transactional
    public void updatePermissions(String name, Map<AdminResource, PermissionLevel> updates) {
        getOrThrow(name);
        for (Map.Entry<AdminResource, PermissionLevel> entry : updates.entrySet()) {
            CustomRolePermission row = customRolePermissionRepository
                    .findByCustomRoleNameAndResource(name, entry.getKey())
                    .orElseGet(() -> CustomRolePermission.builder()
                            .customRoleName(name)
                            .resource(entry.getKey())
                            .build());
            row.setLevel(entry.getValue());
            customRolePermissionRepository.save(row);
        }
        log.info("Custom role {} permissions updated", name);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean can(String customRoleName, AdminResource resource, PermissionLevel required) {
        return customRolePermissionRepository.findByCustomRoleNameAndResource(customRoleName, resource)
                .map(CustomRolePermission::getLevel)
                .orElse(PermissionLevel.NONE)
                .satisfies(required);
    }

    private CustomRole getOrThrow(String name) {
        return customRoleRepository.findById(name)
                .orElseThrow(() -> new ResourceNotFoundException("Rôle personnalisé introuvable : " + name));
    }
}
