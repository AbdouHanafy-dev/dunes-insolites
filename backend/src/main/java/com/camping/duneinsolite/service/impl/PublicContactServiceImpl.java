package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.publicapi.ContactRequest;
import com.camping.duneinsolite.service.PublicContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PublicContactServiceImpl implements PublicContactService {

    private final EmailService emailService;

    @Override
    public void submitContactMessage(ContactRequest request) {
        emailService.sendContactMessage(request.getName(), request.getEmail(), request.getSubject(), request.getMessage());
    }
}
