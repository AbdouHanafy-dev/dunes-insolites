package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.DriverProfileCreateRequest;
import com.camping.duneinsolite.dto.request.DriverProfileUpdateRequest;
import com.camping.duneinsolite.model.DriverProfile;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.DriverProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.UUID;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DriverProfileServiceTest {
    private DriverProfileRepository repository;
    private KeycloakUserSyncService userSyncService;
    private AccountActionService accountActionService;
    private DriverProfileService service;

    @BeforeEach
    void setUp() {
        repository = mock(DriverProfileRepository.class);
        userSyncService = mock(KeycloakUserSyncService.class);
        accountActionService = mock(AccountActionService.class);
        service = new DriverProfileService(repository, userSyncService, accountActionService);
        when(repository.save(any(DriverProfile.class))).thenAnswer(invocation -> {
            DriverProfile profile = invocation.getArgument(0);
            profile.setDriverProfileId(UUID.randomUUID());
            return profile;
        });
    }

    @Test
    void createBuildsPermanentProfileAndSendsPasswordSetupInvitation() {
        DriverProfileCreateRequest request = request();
        User user = User.builder()
                .userId(UUID.randomUUID())
                .name("Amine Ben Ali")
                .email("amine@example.com")
                .role(UserRole.CHAUFFEUR)
                .build();
        when(userSyncService.adminCreateInvitedDriver("Amine Ben Ali", "amine@example.com", "+216 20 000 000"))
                .thenReturn(user);

        var response = service.create(request);

        ArgumentCaptor<DriverProfile> profile = ArgumentCaptor.forClass(DriverProfile.class);
        verify(repository).save(profile.capture());
        assertThat(profile.getValue().getUser()).isSameAs(user);
        assertThat(profile.getValue().getVehicleModel()).isEqualTo("Toyota Land Cruiser");
        assertThat(profile.getValue().isActive()).isTrue();
        assertThat(response.getEmail()).isEqualTo("amine@example.com");
        verify(accountActionService).sendPasswordSetupInvitation(user);
    }

    @Test
    void createRejectsDuplicateBeforeCreatingIdentity() {
        DriverProfileCreateRequest request = request();
        when(repository.existsByUser_EmailIgnoreCase("amine@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
        verifyNoInteractions(userSyncService, accountActionService);
    }

    @Test
    void deactivateAlsoDisablesTheLoginButKeepsTheProfile() {
        User user = User.builder().userId(UUID.randomUUID()).name("Amine Ben Ali")
                .email("amine@example.com").role(UserRole.CHAUFFEUR).build();
        DriverProfile profile = DriverProfile.builder().driverProfileId(UUID.randomUUID()).user(user)
                .firstName("Amine").lastName("Ben Ali").active(true).build();
        when(repository.findById(profile.getDriverProfileId())).thenReturn(Optional.of(profile));
        DriverProfileUpdateRequest request = new DriverProfileUpdateRequest();
        request.setActive(false);

        var response = service.update(profile.getDriverProfileId(), request);

        verify(userSyncService).setUserEnabled(user.getUserId(), false);
        assertThat(response.isActive()).isFalse();
        verify(repository, never()).delete(any());
    }

    private DriverProfileCreateRequest request() {
        DriverProfileCreateRequest request = new DriverProfileCreateRequest();
        request.setFirstName(" Amine ");
        request.setLastName(" Ben Ali ");
        request.setEmail("AMINE@example.com");
        request.setPhoneNumber("+216 20 000 000");
        request.setVehicleModel("Toyota Land Cruiser");
        request.setNumberOfSeats(6);
        return request;
    }
}
