package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.publicapi.ContactRequest;

public interface PublicContactService {
    void submitContactMessage(ContactRequest request);
}
