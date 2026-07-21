package com.camping.duneinsolite.dto.response;

import lombok.Data;
import java.util.UUID;

@Data
public class ParticipantResponse {
    private UUID participantId;
    private String fullName;
    private Integer age;
    private Boolean isAdult;
}