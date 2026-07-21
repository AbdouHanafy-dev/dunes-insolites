// SourceUpdateRequest.java
package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SourceUpdateRequest {
    @NotBlank
    private String name;
}