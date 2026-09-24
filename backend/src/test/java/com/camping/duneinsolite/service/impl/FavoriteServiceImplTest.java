package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.FavoriteRequest;
import com.camping.duneinsolite.dto.response.FavoriteResponse;
import com.camping.duneinsolite.exception.InvalidFavoriteException;
import com.camping.duneinsolite.model.Favorite;
import com.camping.duneinsolite.model.enums.FavoriteType;
import com.camping.duneinsolite.repository.FavoriteRepository;
import com.camping.duneinsolite.security.CallerContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FavoriteServiceImplTest {

    private FavoriteRepository repository;
    private CallerContext caller;
    private FavoriteServiceImpl service;
    private final UUID me = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        repository = mock(FavoriteRepository.class);
        caller = mock(CallerContext.class);
        when(caller.requireUserId()).thenReturn(me);
        service = new FavoriteServiceImpl(repository, caller);
    }

    private static FavoriteRequest req(FavoriteType type, String slug) {
        FavoriteRequest r = new FavoriteRequest();
        r.setType(type);
        r.setSlug(slug);
        return r;
    }

    @Test
    void addSavesForTheCallerNeverForAnIdFromTheRequest() {
        service.add(FavoriteType.ACTIVITY, "camel-trek");

        verify(repository).save(any(Favorite.class));
        verify(repository).existsByUserIdAndItemTypeAndItemSlug(me, FavoriteType.ACTIVITY, "camel-trek");
    }

    @Test
    void addingSomethingAlreadySavedChangesNothing() {
        when(repository.existsByUserIdAndItemTypeAndItemSlug(me, FavoriteType.STAY, "nuitee-campement-desert")).thenReturn(true);

        service.add(FavoriteType.STAY, "nuitee-campement-desert");

        verify(repository, never()).save(any(Favorite.class));
    }

    @Test
    void addRejectsSlugsThatAreNotPublicSlugs() {
        for (String bad : List.of("Camel Trek", "../x", "a--b", "-a", "a-", "", "x".repeat(161))) {
            assertThatThrownBy(() -> service.add(FavoriteType.TOUR, bad)).isInstanceOf(InvalidFavoriteException.class);
        }
        verify(repository, never()).save(any(Favorite.class));
    }

    @Test
    void removeOnlyTouchesTheCallersOwnRow() {
        service.remove(FavoriteType.TOUR, "tunisie-2-jours-oasis-montagne-sahara");

        verify(repository).deleteByUserIdAndItemTypeAndItemSlug(me, FavoriteType.TOUR, "tunisie-2-jours-oasis-montagne-sahara");
    }

    @Test
    void mergeSkipsBadEntriesButStillSavesTheGoodOnes() {
        when(repository.findByUserIdOrderByCreatedAtDesc(me)).thenReturn(List.of());

        service.merge(List.of(req(FavoriteType.TOUR, "good-slug"), req(FavoriteType.TOUR, "BAD SLUG"), req(null, "other-slug")));

        verify(repository, org.mockito.Mockito.times(1)).save(any(Favorite.class));
    }

    @Test
    void mergeStopsAtTheCeilingInsteadOfFillingTheTable() {
        when(repository.countByUserId(me)).thenReturn((long) FavoriteServiceImpl.MAX_PER_USER);
        when(repository.findByUserIdOrderByCreatedAtDesc(me)).thenReturn(List.of());

        service.merge(List.of(req(FavoriteType.TOUR, "one"), req(FavoriteType.TOUR, "two")));

        verify(repository, never()).save(any(Favorite.class));
    }

    @Test
    void getMineListsTheCallersFavouritesInTheWireShape() {
        Favorite f = Favorite.builder().userId(me).itemType(FavoriteType.ACTIVITY).itemSlug("quad-desert").build();
        when(repository.findByUserIdOrderByCreatedAtDesc(eq(me))).thenReturn(List.of(f));

        List<FavoriteResponse> out = service.getMine();

        assertThat(out).hasSize(1);
        assertThat(out.get(0).getType()).isEqualTo(FavoriteType.ACTIVITY);
        assertThat(out.get(0).getSlug()).isEqualTo("quad-desert");
    }
}
