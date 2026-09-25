package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.GuideProfileCreateRequest;
import com.camping.duneinsolite.dto.request.GuideProfileUpdateRequest;
import com.camping.duneinsolite.mapper.SpokenLanguageMapper;
import com.camping.duneinsolite.model.GuideProfile;
import com.camping.duneinsolite.repository.GuideProfileRepository;
import com.camping.duneinsolite.repository.SpokenLanguageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GuideProfileServiceTest {
    private GuideProfileRepository repository;
    private GuideProfileService service;

    @BeforeEach
    void setUp() {
        repository = mock(GuideProfileRepository.class);
        service = new GuideProfileService(
                repository,
                mock(SpokenLanguageRepository.class),
                mock(SpokenLanguageMapper.class),
                mock(com.camping.duneinsolite.service.impl.AccountDeletion.class));
        when(repository.save(any(GuideProfile.class))).thenAnswer(invocation -> {
            GuideProfile profile = invocation.getArgument(0);
            if (profile.getGuideProfileId() == null) profile.setGuideProfileId(UUID.randomUUID());
            return profile;
        });
    }

    @Test
    void createBuildsReusableActiveProfile() {
        GuideProfileCreateRequest request = new GuideProfileCreateRequest();
        request.setFirstName(" Amine ");
        request.setLastName(" Ben Ali ");
        request.setEmail("AMINE@example.com");
        request.setPhoneNumber(" +216 20 000 000 ");

        var response = service.create(request);

        ArgumentCaptor<GuideProfile> profile = ArgumentCaptor.forClass(GuideProfile.class);
        verify(repository).save(profile.capture());
        assertThat(profile.getValue().getFirstName()).isEqualTo("Amine");
        assertThat(profile.getValue().getEmail()).isEqualTo("amine@example.com");
        assertThat(profile.getValue().isActive()).isTrue();
        assertThat(response.getGuideProfileId()).isNotNull();
    }

    @Test
    void createRejectsDuplicateEmail() {
        GuideProfileCreateRequest request = new GuideProfileCreateRequest();
        request.setFirstName("Amine");
        request.setLastName("Ben Ali");
        request.setEmail("amine@example.com");
        when(repository.existsByEmailIgnoreCase("amine@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already exists");
        verify(repository, never()).save(any());
    }

    @Test
    void deactivateKeepsThePermanentProfile() {
        UUID id = UUID.randomUUID();
        GuideProfile profile = GuideProfile.builder()
                .guideProfileId(id)
                .firstName("Amine")
                .lastName("Ben Ali")
                .languages(new HashSet<>())
                .active(true)
                .build();
        when(repository.findById(id)).thenReturn(Optional.of(profile));
        GuideProfileUpdateRequest request = new GuideProfileUpdateRequest();
        request.setActive(false);

        var response = service.update(id, request);

        assertThat(response.isActive()).isFalse();
        verify(repository).save(profile);
        verify(repository, never()).delete(any());
    }
}
