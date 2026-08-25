package com.camping.duneinsolite.mapper;

import com.camping.duneinsolite.dto.response.TransactionResponse;
import com.camping.duneinsolite.model.Transaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TransactionMapper {

    @Mapping(source = "reservation.reservationId", target = "reservationId")
    @Mapping(source = "invoice.invoiceId", target = "invoiceId")
    TransactionResponse toResponse(Transaction transaction);
}