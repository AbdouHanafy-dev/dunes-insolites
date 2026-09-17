package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.ServiceOptionRequest;
import com.camping.duneinsolite.dto.response.ServiceOptionResponse;
import com.camping.duneinsolite.model.enums.ServiceOptionCategory;
import com.camping.duneinsolite.service.ServiceOptionAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Guide/transport/pickup options for the "Getting There & Guide" booking
 * step. Own permission resource (SERVICE_OPTIONS) - this is genuinely
 * distinct catalogue from Hébergements/Extras, not folded into either.
 */
@RestController
@RequestMapping("/api/service-options")
@RequiredArgsConstructor
public class ServiceOptionController {

    private final ServiceOptionAdminService service;

    @GetMapping
    @PreAuthorize("@perm.can('SERVICE_OPTIONS', 'EDIT')")
    public List<ServiceOptionResponse> list(@RequestParam(required = false) ServiceOptionCategory category) {
        return service.list(category);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@perm.can('SERVICE_OPTIONS', 'EDIT')")
    public ServiceOptionResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("@perm.can('SERVICE_OPTIONS', 'FULL')")
    public ResponseEntity<ServiceOptionResponse> create(@Valid @RequestBody ServiceOptionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.can('SERVICE_OPTIONS', 'FULL')")
    public ServiceOptionResponse update(@PathVariable UUID id, @Valid @RequestBody ServiceOptionRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.can('SERVICE_OPTIONS', 'FULL')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
