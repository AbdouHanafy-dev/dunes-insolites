package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.response.ProduitResponse;

import java.util.List;

public interface ProduitService {
    List<ProduitResponse> getAllProduits();
}
