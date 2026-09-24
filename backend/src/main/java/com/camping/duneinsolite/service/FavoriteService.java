package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.FavoriteRequest;
import com.camping.duneinsolite.dto.response.FavoriteResponse;
import com.camping.duneinsolite.model.enums.FavoriteType;

import java.util.List;

/** The caller's own favourites — the user is always the JWT subject, never a parameter. */
public interface FavoriteService {

    List<FavoriteResponse> getMine();

    /** Idempotent: saving something already saved changes nothing. */
    void add(FavoriteType type, String slug);

    /** Idempotent: removing something not saved is not an error. */
    void remove(FavoriteType type, String slug);

    /** Saves every item of the list that is not already saved, and returns the full list. */
    List<FavoriteResponse> merge(List<FavoriteRequest> items);
}
