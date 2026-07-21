package com.camping.duneinsolite.service.impl;


import com.camping.duneinsolite.dto.request.TransactionRequest;
import com.camping.duneinsolite.dto.response.TransactionResponse;
import com.camping.duneinsolite.mapper.TransactionMapper;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.PaymentStatus;
import com.camping.duneinsolite.model.enums.TransactionStatus;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final ReservationRepository reservationRepository;
    private final InvoiceRepository invoiceRepository;
    private final TransactionMapper transactionMapper;

    @Override
    public TransactionResponse createTransaction(TransactionRequest request) {
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new RuntimeException("Reservation not found: " + request.getReservationId()));

        Transaction transaction = Transaction.builder()
                .transactionNumber(generateTransactionNumber())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .paymentMethod(request.getPaymentMethod())
                .status(TransactionStatus.COMPLETED)
                .reservation(reservation)
                .build();

        // Link to invoice if provided, and update invoice payment status
        if (request.getInvoiceId() != null) {
            Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                    .orElseThrow(() -> new RuntimeException("Invoice not found: " + request.getInvoiceId()));
            transaction.setInvoice(invoice);

            // Update invoice paid amount and payment status
            double newPaidAmount = invoice.getPaidAmount() + request.getAmount();
            invoice.setPaidAmount(newPaidAmount);

            if (newPaidAmount <= 0) {
                invoice.setPaymentStatus(PaymentStatus.UNPAID);
            } else if (newPaidAmount < invoice.getTotalAmount()) {
                invoice.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
            } else {
                invoice.setPaymentStatus(PaymentStatus.PAID);
            }

            invoiceRepository.save(invoice);
        }

        return transactionMapper.toResponse(transactionRepository.save(transaction));
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(UUID transactionId) {
        return transactionMapper.toResponse(findById(transactionId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getAllTransactions() {
        return transactionRepository.findAll().stream().map(transactionMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsByReservation(UUID reservationId) {
        return transactionRepository.findByReservationReservationId(reservationId).stream()
                .map(transactionMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsByInvoice(UUID invoiceId) {
        return transactionRepository.findByInvoiceInvoiceId(invoiceId).stream()
                .map(transactionMapper::toResponse).toList();
    }

    private String generateTransactionNumber() {
        long count = transactionRepository.count() + 1;
        return String.format("TXN-%05d", count);
    }

    private Transaction findById(UUID transactionId) {
        return transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found: " + transactionId));
    }
}