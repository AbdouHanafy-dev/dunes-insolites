package com.camping.duneinsolite.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PromoCodeRequest {

    /** Letters, digits, dash or underscore; matched ignoring case. */
    @NotBlank
    @Size(max = 40)
    @Pattern(regexp = "[A-Za-z0-9_-]+", message = "Use letters, digits, - or _ only")
    private String code;

    @NotBlank
    @Size(max = 120)
    private String partnerName;

    @DecimalMin(value = "0.01", message = "Discount must be above 0")
    @DecimalMax(value = "100", message = "Discount cannot exceed 100")
    private BigDecimal discountPercent;

    /** What the partner earns on the circuits the code brought in; null until the owner sets it. */
    @DecimalMin("0")
    @DecimalMax("100")
    private BigDecimal commissionPercent;

    private LocalDate validFrom;
    private LocalDate validUntil;
    private Boolean active;
}
