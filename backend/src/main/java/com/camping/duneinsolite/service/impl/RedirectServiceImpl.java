package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.RedirectRequest;
import com.camping.duneinsolite.dto.response.RedirectResponse;
import com.camping.duneinsolite.exception.RedirectConflictException;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.mapper.RedirectMapper;
import com.camping.duneinsolite.model.Redirect;
import com.camping.duneinsolite.repository.RedirectRepository;
import com.camping.duneinsolite.service.RedirectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class RedirectServiceImpl implements RedirectService {

    private final RedirectRepository redirectRepository;
    private final RedirectMapper redirectMapper;

    @Override
    public RedirectResponse createRedirect(RedirectRequest request) {
        validate(request, null);
        Redirect redirect = redirectMapper.toEntity(request);
        if (redirect.getStatusCode() == null) redirect.setStatusCode(301);
        return redirectMapper.toResponse(redirectRepository.save(redirect));
    }

    @Override
    @Transactional(readOnly = true)
    public RedirectResponse getRedirectById(UUID redirectId) {
        return redirectMapper.toResponse(findById(redirectId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RedirectResponse> getAllRedirects() {
        return redirectRepository.findAllByOrderByFromPathAsc().stream()
                .map(redirectMapper::toResponse).toList();
    }

    @Override
    public RedirectResponse updateRedirect(UUID redirectId, RedirectRequest request) {
        Redirect redirect = findById(redirectId);
        validate(request, redirectId);
        redirectMapper.updateEntity(request, redirect);
        return redirectMapper.toResponse(redirectRepository.save(redirect));
    }

    @Override
    public void deleteRedirect(UUID redirectId) {
        redirectRepository.delete(findById(redirectId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RedirectResponse> getPublicRedirects() {
        return getAllRedirects();
    }

    // A redirect to itself is always a mistake (an infinite loop on the
    // frontend's own middleware, not just a wasted hop), and two redirects
    // for the same from-path is ambiguous - reject both before they ever
    // reach the DB's unique constraint as a raw, unhelpful 500.
    private void validate(RedirectRequest request, UUID editingId) {
        if (request.getFromPath().equals(request.getToPath())) {
            throw new RedirectConflictException("From path and to path cannot be the same.");
        }
        redirectRepository.findByFromPath(request.getFromPath()).ifPresent(existing -> {
            if (!existing.getRedirectId().equals(editingId)) {
                throw new RedirectConflictException(
                        "A redirect from \"" + request.getFromPath() + "\" already exists.");
            }
        });
    }

    private Redirect findById(UUID redirectId) {
        return redirectRepository.findById(redirectId)
                .orElseThrow(() -> new ResourceNotFoundException("Redirect not found: " + redirectId));
    }
}
