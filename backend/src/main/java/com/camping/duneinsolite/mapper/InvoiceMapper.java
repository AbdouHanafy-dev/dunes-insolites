package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.response.InvoiceItemResponse;
import com.camping.duneinsolite.dto.response.InvoiceResponse;
import com.camping.duneinsolite.model.Invoice;
import com.camping.duneinsolite.model.InvoiceItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface InvoiceMapper {

    @Mapping(source = "reservation.reservationId", target = "reservationId")
    @Mapping(source = "user.userId",               target = "userId")
    @Mapping(source = "user.name",                 target = "userName")
    @Mapping(source = "user.email",                target = "userEmail")
    @Mapping(source = "user.phone",                target = "userPhone")
    @Mapping(source = "user.matriculeFiscal",      target = "userMatriculeFiscal")
    @Mapping(source = "user.agencyAddress",        target = "userAgencyAddress")
    @Mapping(target = "remainingAmount",  expression = "java(invoice.getRemainingAmount())")
    @Mapping(target = "arreteLaPresente", expression = "java(buildArrete(invoice))")
    @Mapping(target = "snapshotLines",    ignore = true)
    InvoiceResponse toResponse(Invoice invoice);

    @Mapping(target = "totalPrice", expression = "java(item.getTotalPrice())")
    InvoiceItemResponse toItemResponse(InvoiceItem item);

    default String buildArrete(Invoice invoice) {
        if (invoice.getTotalTtc() == null) return null;
        java.math.BigDecimal amount = com.camping.duneinsolite.money.Money.round(invoice.getTotalTtc());
        long dinars   = amount.longValue();
        long millimes = amount.remainder(java.math.BigDecimal.ONE)
                .movePointRight(3).abs().longValue();
        return String.format("%d DINARS ET %03d MILLIMES", dinars, millimes);
    }
}
