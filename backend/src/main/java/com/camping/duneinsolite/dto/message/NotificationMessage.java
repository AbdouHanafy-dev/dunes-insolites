package com.camping.duneinsolite.dto.message;

import com.camping.duneinsolite.model.enums.NotificationType;
import com.camping.duneinsolite.model.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage {

    // WHO gets notified
    // use targetUserId when notifying ONE specific user
    // example: owner of the reservation
    private UUID targetUserId;


    // use targetRoles when notifying ALL users of a role
    // example: all ADMIN users, all CAMPING users
    private List<UserRole> targetRoles;

    // WHAT type of notification
    private NotificationType type;

    // WHAT to display
    private String title;
    private String message;

    // CONTEXT — so frontend can navigate to the reservation
    private UUID reservationId;

    // WHICH event triggered this
    // example: "reservation.created", "reservation.confirmed"
    private String routingKey;
}
