package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.MaintenanceWindowRequest;
import com.camping.duneinsolite.dto.response.MaintenanceWindowResponse;
import com.camping.duneinsolite.exception.MaintenanceConflictException;
import com.camping.duneinsolite.mapper.MaintenanceWindowMapper;
import com.camping.duneinsolite.model.MaintenanceWindow;
import com.camping.duneinsolite.repository.MaintenanceWindowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The duplicate-path guard is the one piece of real business logic in
 * MaintenanceWindowServiceImpl (everything else is CRUD passthrough) - a
 * second window for a path already under maintenance is ambiguous (which
 * one wins?), same reasoning as RedirectServiceImpl's own from/to check.
 * No Spring context needed - purely the validate() branching against a
 * mocked repository, same style as AuthControllerRegisterSecurityTest.
 */
class MaintenanceWindowServiceImplTest {

    private MaintenanceWindowRepository repository;
    private MaintenanceWindowServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(MaintenanceWindowRepository.class);
        MaintenanceWindowMapper mapper = mock(MaintenanceWindowMapper.class);
        when(mapper.toEntity(any(MaintenanceWindowRequest.class)))
                .thenAnswer(inv -> {
                    MaintenanceWindowRequest r = inv.getArgument(0);
                    return MaintenanceWindow.builder().path(r.getPath()).isActive(r.getIsActive()).build();
                });
        when(mapper.toResponse(any(MaintenanceWindow.class)))
                .thenAnswer(inv -> {
                    MaintenanceWindow w = inv.getArgument(0);
                    MaintenanceWindowResponse r = new MaintenanceWindowResponse();
                    r.setPath(w.getPath());
                    return r;
                });
        when(repository.save(any(MaintenanceWindow.class))).thenAnswer(inv -> inv.getArgument(0));
        service = new MaintenanceWindowServiceImpl(repository, mapper);
    }

    @Test
    void createRejectsADuplicatePath() {
        MaintenanceWindowRequest request = new MaintenanceWindowRequest();
        request.setPath("/nuitee-campement-desert/");

        when(repository.findByPath("/nuitee-campement-desert/"))
                .thenReturn(Optional.of(MaintenanceWindow.builder()
                        .maintenanceId(UUID.randomUUID())
                        .path("/nuitee-campement-desert/")
                        .build()));

        assertThatThrownBy(() -> service.createMaintenanceWindow(request))
                .isInstanceOf(MaintenanceConflictException.class)
                .hasMessageContaining("/nuitee-campement-desert/");
    }

    @Test
    void createAllowsAFreshPath() {
        MaintenanceWindowRequest request = new MaintenanceWindowRequest();
        request.setPath("/nuitee-campement-desert/");
        when(repository.findByPath("/nuitee-campement-desert/")).thenReturn(Optional.empty());

        MaintenanceWindowResponse response = service.createMaintenanceWindow(request);

        assertThat(response.getPath()).isEqualTo("/nuitee-campement-desert/");
    }

    @Test
    void updateDoesNotFlagTheWindowsOwnUnchangedPathAsAConflict() {
        UUID id = UUID.randomUUID();
        MaintenanceWindow existing = MaintenanceWindow.builder()
                .maintenanceId(id)
                .path("/nuitee-campement-desert/")
                .isActive(true)
                .build();
        when(repository.findById(id)).thenReturn(Optional.of(existing));
        // The only other row findByPath could plausibly return here is the
        // window being edited itself - same row, same id - which must NOT
        // be treated as a conflict with itself.
        when(repository.findByPath("/nuitee-campement-desert/")).thenReturn(Optional.of(existing));

        MaintenanceWindowRequest request = new MaintenanceWindowRequest();
        request.setPath("/nuitee-campement-desert/");
        request.setIsActive(false);

        // The real assertion is simply that this doesn't throw - a JUnit
        // test method that runs to completion without an exception is a
        // pass; nothing further to assert here.
        service.updateMaintenanceWindow(id, request);
    }

    @Test
    void updateRejectsMovingOntoAnotherWindowsPath() {
        UUID id = UUID.randomUUID();
        MaintenanceWindow existing = MaintenanceWindow.builder()
                .maintenanceId(id)
                .path("/old-path/")
                .build();
        when(repository.findById(id)).thenReturn(Optional.of(existing));

        MaintenanceWindow other = MaintenanceWindow.builder()
                .maintenanceId(UUID.randomUUID())
                .path("/already-taken/")
                .build();
        when(repository.findByPath("/already-taken/")).thenReturn(Optional.of(other));

        MaintenanceWindowRequest request = new MaintenanceWindowRequest();
        request.setPath("/already-taken/");

        assertThatThrownBy(() -> service.updateMaintenanceWindow(id, request))
                .isInstanceOf(MaintenanceConflictException.class);
    }
}
