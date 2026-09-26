package com.camping.duneinsolite.dto.response;

import java.math.BigDecimal;

/** The public answer to "is this code good?": no partner, no rate of commission, nothing else. */
public record PromoCodeCheckResponse(boolean valid, BigDecimal discountPercent) {}
