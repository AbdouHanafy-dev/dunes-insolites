package com.camping.duneinsolite.dto.request;

import lombok.Data;

@Data
public class ChauffeurUpdateRequest {
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String vehicleModel;
    private Integer numberOfSeats;
    // null = leave the current link untouched, "" = unlink, any other
    // value = look up and (re)link to that driver account.
    private String driverUserEmail;
}