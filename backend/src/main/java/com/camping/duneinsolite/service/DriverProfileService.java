package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.DriverProfileCreateRequest;
import com.camping.duneinsolite.dto.request.DriverProfileUpdateRequest;
import com.camping.duneinsolite.dto.response.DriverProfileResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.DriverProfile;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.repository.DriverProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DriverProfileService {
    private final DriverProfileRepository repository;
    private final KeycloakUserSyncService userSyncService;
    private final AccountActionService accountActionService;

    @Transactional(readOnly = true)
    public List<DriverProfileResponse> getAll() {
        return repository.findAllByOrderByActiveDescFirstNameAscLastNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DriverProfile getActiveEntity(UUID id) {
        return repository.findByDriverProfileIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Active driver profile not found: " + id));
    }

    @Transactional
    public DriverProfile lockActiveEntity(UUID id) {
        return repository.lockActiveById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Active driver profile not found: " + id));
    }

    @Transactional
    public DriverProfileResponse create(DriverProfileCreateRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (repository.existsByUser_EmailIgnoreCase(email)) {
            throw new IllegalArgumentException("A driver profile already exists for this email");
        }

        String fullName = (request.getFirstName().trim() + " " + request.getLastName().trim()).trim();
        User user = userSyncService.adminCreateInvitedDriver(fullName, email, blankToNull(request.getPhoneNumber()));
        DriverProfile profile = repository.save(DriverProfile.builder()
                .user(user)
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .phoneNumber(blankToNull(request.getPhoneNumber()))
                .vehicleModel(blankToNull(request.getVehicleModel()))
                .numberOfSeats(request.getNumberOfSeats())
                .active(true)
                .build());

        accountActionService.sendPasswordSetupInvitation(user);
        return toResponse(profile);
    }

    @Transactional
    public DriverProfileResponse update(UUID id, DriverProfileUpdateRequest request) {
        DriverProfile profile = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Driver profile not found: " + id));
        if (request.getFirstName() != null && !request.getFirstName().isBlank()) profile.setFirstName(request.getFirstName().trim());
        if (request.getLastName() != null && !request.getLastName().isBlank()) profile.setLastName(request.getLastName().trim());
        if (request.getPhoneNumber() != null) profile.setPhoneNumber(blankToNull(request.getPhoneNumber()));
        if (request.getVehicleModel() != null) profile.setVehicleModel(blankToNull(request.getVehicleModel()));
        if (request.getNumberOfSeats() != null) profile.setNumberOfSeats(request.getNumberOfSeats());
        profile.getUser().setName((profile.getFirstName() + " " + profile.getLastName()).trim());
        profile.getUser().setPhone(profile.getPhoneNumber());
        if (request.getActive() != null && request.getActive() != profile.isActive()) {
            userSyncService.setUserEnabled(profile.getUser().getUserId(), request.getActive());
            profile.setActive(request.getActive());
        }
        return toResponse(repository.save(profile));
    }

    @Transactional
    public void resendInvitation(UUID id) {
        DriverProfile profile = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Driver profile not found: " + id));
        if (!profile.isActive()) {
            throw new IllegalArgumentException("Reactivate the driver before sending an invitation");
        }
        accountActionService.sendPasswordSetupInvitation(profile.getUser());
    }

    private DriverProfileResponse toResponse(DriverProfile profile) {
        return DriverProfileResponse.builder()
                .driverProfileId(profile.getDriverProfileId())
                .userId(profile.getUser().getUserId())
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .email(profile.getUser().getEmail())
                .phoneNumber(profile.getPhoneNumber())
                .vehicleModel(profile.getVehicleModel())
                .numberOfSeats(profile.getNumberOfSeats())
                .active(profile.isActive())
                .build();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
