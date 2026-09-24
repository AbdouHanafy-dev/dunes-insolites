package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/** The ids of a list, in the order the editor wants them displayed. */
@Data
public class ReorderRequest {
    @NotEmpty
    private List<UUID> ids;
}
