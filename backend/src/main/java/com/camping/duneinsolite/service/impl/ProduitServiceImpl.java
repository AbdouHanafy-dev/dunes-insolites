package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.response.ProduitResponse;
import com.camping.duneinsolite.model.enums.ProductType;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.service.ProduitService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProduitServiceImpl implements ProduitService {

    private final TourTypeRepository tourTypeRepository;
    private final TourRepository tourRepository;
    private final ExtraRepository extraRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ProduitResponse> getAllProduits() {
        List<ProduitResponse> result = new ArrayList<>();

        tourTypeRepository.findAll().forEach(tt -> result.add(
                ProduitResponse.builder()
                        .id(tt.getTourTypeId())
                        .type(ProductType.TOURTYPE)
                        .name(tt.getName())
                        .description(tt.getDescription())
                        .passengerAdultPrice(tt.getPassengerAdultPrice())
                        .passengerChildPrice(tt.getPassengerChildPrice())
                        .passengerInfantPrice(tt.getPassengerInfantPrice())
                        .partnerAdultPrice(tt.getPartnerAdultPrice())
                        .partnerChildPrice(tt.getPartnerChildPrice())
                        .tva(tt.getTva())
                        .build()
        ));

        tourRepository.findAll().forEach(t -> result.add(
                ProduitResponse.builder()
                        .id(t.getTourId())
                        .type(ProductType.TOUR)
                        .name(t.getName())
                        .description(t.getDescription())
                        .passengerAdultPrice(t.getPassengerAdultPrice())
                        .passengerChildPrice(t.getPassengerChildPrice())
                        .passengerInfantPrice(t.getPassengerInfantPrice())
                        .partnerAdultPrice(t.getPartnerAdultPrice())
                        .partnerChildPrice(t.getPartnerChildPrice())
                        .tva(t.getTva())
                        .build()
        ));

        extraRepository.findAll().forEach(e -> result.add(
                ProduitResponse.builder()
                        .id(e.getExtraId())
                        .type(ProductType.EXTRA)
                        .name(e.getName())
                        .description(e.getDescription())
                        .unitPrice(e.getUnitPrice())
                        .tva(e.getTva())
                        .build()
        ));

        return result;
    }
}
