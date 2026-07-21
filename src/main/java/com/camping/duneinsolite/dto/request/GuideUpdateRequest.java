package com.camping.duneinsolite.dto.request;

import lombok.Data;

@Data
public class GuideUpdateRequest {
    private String firstName;
    private String lastName;
    private String phoneNumber;
}