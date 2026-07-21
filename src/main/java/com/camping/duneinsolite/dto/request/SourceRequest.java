// SourceRequest.java
package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SourceRequest {
    @NotBlank
    private String name;
}