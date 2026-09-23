package com.camping.duneinsolite.service.impl;


import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.dto.request.TransactionRequest;
import com.camping.duneinsolite.dto.response.TransactionResponse;
import com.camping.duneinsolite.mapper.TransactionMapper;
import com.camping.duneinsolite.model.*;
import com.camping.duneinsolite.model.enums.PaymentStatus;
import com.camping.duneinsolite.model.enums.TransactionStatus;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository transactionRepository;
    private final PaymentRequestService paymentRequestService;
    private final ReservationRepository reservationRepository;
    private final InvoiceRepository invoiceRepository;
    private final TransactionMapper transactionMapper;

    @Override
    public TransactionResponse createTransaction(TransactionRequest request) {
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + request.getReservationId()));

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
                    .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + request.getInvoiceId()));
            transaction.setInvoice(invoice);

            // Update invoice paid amount and payment status
            java.math.BigDecimal newPaidAmount =
                    com.camping.duneinsolite.money.Money.add(invoice.getPaidAmount(), request.getAmount());
            invoice.setPaidAmount(newPaidAmount);

            if (newPaidAmount.signum() <= 0) {
                invoice.setPaymentStatus(PaymentStatus.UNPAID);
            } else if (com.camping.duneinsolite.money.Money.lt(newPaidAmount, invoice.getTotalAmount())) {
                invoice.setPaymentStatus(PaymentStatus.PARTIALLY_PAID);
            } else {
                invoice.setPaymentStatus(PaymentStatus.PAID);
            }

            invoiceRepository.save(invoice);
        }

        TransactionResponse saved = transactionMapper.toResponse(transactionRepository.save(transaction));

        if (!Boolean.FALSE.equals(request.getNotifyClient())) {
            paymentRequestService.sendPaymentReceived(reservation.getReservationId(), request.getAmount());
        }
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(UUID transactionId) {
        return transactionMapper.toResponse(findById(transactionId));
    }

    // Was an unbounded findAll() (ARCHITECTURE.md §13 item 15). Every
    // transaction ever recorded, loaded into memory on one request - now
    // bounded via Pageable, same convention ReservationServiceImpl's
    // sibling endpoints already use.
    @Override
    @Transactional(readOnly = true)
    public Page<TransactionResponse> getAllTransactions(Pageable pageable) {
        return transactionRepository.findAll(pageable).map(transactionMapper::toResponse);
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
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + transactionId));
    }
}
