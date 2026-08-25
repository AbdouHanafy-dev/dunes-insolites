package com.camping.duneinsolite.service;


import com.camping.duneinsolite.dto.request.TransactionRequest;
import com.camping.duneinsolite.dto.response.TransactionResponse;
import java.util.List;
import java.util.UUID;

public interface TransactionService {
    TransactionResponse createTransaction(TransactionRequest request);
    TransactionResponse getTransactionById(UUID transactionId);
    List<TransactionResponse> getAllTransactions();
    List<TransactionResponse> getTransactionsByReservation(UUID reservationId);
    List<TransactionResponse> getTransactionsByInvoice(UUID invoiceId);
}
