package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.ServiceOptionRequest;
import com.camping.duneinsolite.dto.response.ServiceOptionResponse;
import com.camping.duneinsolite.exception.ConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.ServiceOption;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;
import com.camping.duneinsolite.money.Money;
import com.camping.duneinsolite.repository.ServiceOptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ServiceOptionAdminService {

    private final ServiceOptionRepository repository;

    @Transactional(readOnly = true)
    public List<ServiceOptionResponse> list(ServiceOptionCategory category) {
        List<ServiceOption> rows = category != null
                ? repository.findByCategoryOrderByDisplayOrderAsc(category)
                : repository.findAll();
        return rows.stream().map(ServiceOptionResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ServiceOptionResponse get(UUID id) {
        return ServiceOptionResponse.from(find(id));
    }

    public ServiceOptionResponse create(ServiceOptionRequest req) {
        repository.findBySlug(req.getSlug()).ifPresent(x -> {
            throw new ConflictException("A service option with slug '" + req.getSlug() + "' already exists.");
        });
        ServiceOption o = ServiceOption.builder()
                .slug(req.getSlug())
                .name(req.getName())
                .description(req.getDescription())
                .category(req.getCategory())
                .type(req.getType())
                .pricingUnit(req.getPricingUnit())
                .unitPriceTtc(Money.round(req.getUnitPriceTtc()))
                .tvaRate(req.getTvaRate() != null ? req.getTvaRate() : java.math.BigDecimal.ZERO)
                .maxUnitsPerDay(req.getMaxUnitsPerDay())
                .requiresPickupLocation(req.getRequiresPickupLocation() != null && req.getRequiresPickupLocation())
                .requiresCustomerVehicle(req.getRequiresCustomerVehicle() != null && req.getRequiresCustomerVehicle())
                .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : 0)
                .active(req.getActive() == null || req.getActive())
                .build();
        return ServiceOptionResponse.from(repository.save(o));
    }

    public ServiceOptionResponse update(UUID id, ServiceOptionRequest req) {
        ServiceOption o = find(id);
        if (!o.getSlug().equals(req.getSlug())) {
            repository.findBySlug(req.getSlug()).ifPresent(x -> {
                throw new ConflictException("A service option with slug '" + req.getSlug() + "' already exists.");
            });
            o.setSlug(req.getSlug());
        }
        o.setName(req.getName());
        o.setDescription(req.getDescription());
        o.setCategory(req.getCategory());
        o.setType(req.getType());
        o.setPricingUnit(req.getPricingUnit());
        o.setUnitPriceTtc(Money.round(req.getUnitPriceTtc()));
        if (req.getTvaRate() != null) o.setTvaRate(req.getTvaRate());
        o.setMaxUnitsPerDay(req.getMaxUnitsPerDay());
        if (req.getRequiresPickupLocation() != null) o.setRequiresPickupLocation(req.getRequiresPickupLocation());
        if (req.getRequiresCustomerVehicle() != null) o.setRequiresCustomerVehicle(req.getRequiresCustomerVehicle());
        if (req.getDisplayOrder() != null) o.setDisplayOrder(req.getDisplayOrder());
        if (req.getActive() != null) o.setActive(req.getActive());
        return ServiceOptionResponse.from(o);
    }

    public void delete(UUID id) {
        repository.delete(find(id));
    }

    private ServiceOption find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service option not found: " + id));
    }
}
