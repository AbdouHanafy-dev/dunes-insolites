package com.camping.duneinsolite.dto.response;

import java.time.LocalDateTime;

public record CustomRoleResponse(String name, String label, LocalDateTime createdAt, long userCount) {
}
