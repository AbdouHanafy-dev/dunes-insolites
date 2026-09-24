package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.response.SiteImageResponse;
import com.camping.duneinsolite.exception.InvalidSiteImageException;
import com.camping.duneinsolite.model.SiteImage;
import com.camping.duneinsolite.repository.SiteImageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SiteImageServiceImplTest {

    private SiteImageRepository repository;
    private SiteImageServiceImpl service;

    @BeforeEach
    void setUp() {
        repository = mock(SiteImageRepository.class);
        when(repository.save(any(SiteImage.class))).thenAnswer(inv -> inv.getArgument(0));
        when(repository.findById(any())).thenReturn(Optional.empty());
        service = new SiteImageServiceImpl(repository);
    }

    @Test
    void setStoresAMediaPathAgainstItsSlot() {
        SiteImageResponse r = service.set("home.hero", "  /media/abc.jpg ");

        assertThat(r.getKey()).isEqualTo("home.hero");
        assertThat(r.getUrl()).isEqualTo("/media/abc.jpg");
    }

    @Test
    void setAcceptsAnAbsoluteWebAddress() {
        assertThat(service.set("about.team", "https://cdn.example.com/team.jpg").getUrl())
                .isEqualTo("https://cdn.example.com/team.jpg");
    }

    @Test
    void setRejectsAddressesThatCouldRunCodeOrLeaveTheSite() {
        for (String bad : List.of("javascript:alert(1)", "data:image/png;base64,AAAA", "//evil.example/x.jpg", "ftp://x/y.jpg", "", "  ")) {
            assertThatThrownBy(() -> service.set("home.hero", bad)).isInstanceOf(InvalidSiteImageException.class);
        }
        verify(repository, never()).save(any(SiteImage.class));
    }

    @Test
    void slotKeysMustBeLowercaseDottedNames() {
        for (String bad : List.of("Home.Hero", "home hero", "../etc", "", ".x", "x.", "a".repeat(81))) {
            assertThatThrownBy(() -> service.set(bad, "/media/a.jpg")).isInstanceOf(InvalidSiteImageException.class);
        }
    }

    @Test
    void resettingASlotThatWasNeverSetIsHarmless() {
        service.reset("home.hero");

        verify(repository, never()).delete(any(SiteImage.class));
    }

    @Test
    void resettingASetSlotDeletesItSoTheBuiltInPhotoReturns() {
        SiteImage existing = SiteImage.builder().imageKey("home.hero").imageUrl("/media/a.jpg").build();
        when(repository.findById("home.hero")).thenReturn(Optional.of(existing));

        service.reset("home.hero");

        verify(repository).delete(existing);
    }

    @Test
    void thePublicMapListsOnlyTheSlotsThatWereReplaced() {
        when(repository.findAll()).thenReturn(List.of(
                SiteImage.builder().imageKey("home.hero").imageUrl("/media/a.jpg").build(),
                SiteImage.builder().imageKey("about.story").imageUrl("/media/b.jpg").build()));

        Map<String, String> map = service.getPublicMap();

        assertThat(map).containsOnlyKeys("home.hero", "about.story");
        assertThat(map.get("about.story")).isEqualTo("/media/b.jpg");
    }
}
