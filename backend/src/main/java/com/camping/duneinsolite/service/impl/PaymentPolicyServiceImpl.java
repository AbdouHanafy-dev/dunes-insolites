package com.camping.duneinsolite.service.impl;

import com.camping.duneinsolite.dto.request.PaymentPolicyRequest;
import com.camping.duneinsolite.dto.response.PaymentPolicyResponse;
import com.camping.duneinsolite.exception.ResourceNotFoundException;
import com.camping.duneinsolite.model.PaymentPolicy;
import com.camping.duneinsolite.repository.PaymentPolicyRepository;
import com.camping.duneinsolite.service.PaymentPolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentPolicyServiceImpl implements PaymentPolicyService {

    // Always exactly one row, seeded by V39__payment_policy.sql.
    private static final Long POLICY_ID = 1L;

    private final PaymentPolicyRepository repository;

    @Override
    @Transactional(readOnly = true)
    public PaymentPolicyResponse getPolicy() {
        return toResponse(findOrThrow());
    }

    @Override
    @Transactional
    public PaymentPolicyResponse updatePolicy(PaymentPolicyRequest request) {
        PaymentPolicy policy = findOrThrow();
        policy.setDepositMode(request.getDepositMode());
        policy.setDepositPercent(request.getDepositPercent());
        policy.setDeadlineDaysBefore(request.getDeadlineDaysBefore());
        policy.setAcceptOnlineLink(request.isAcceptOnlineLink());
        policy.setAcceptBankTransfer(request.isAcceptBankTransfer());
        policy.setAcceptCardOnSite(request.isAcceptCardOnSite());
        policy.setAcceptCashOnSite(request.isAcceptCashOnSite());
        policy.setAcceptCheque(request.isAcceptCheque());
        policy.setNote(request.getNote() == null || request.getNote().isBlank() ? null : request.getNote().trim());
        return toResponse(repository.save(policy));
    }

    private PaymentPolicy findOrThrow() {
        return repository.findById(POLICY_ID)
                .orElseThrow(() -> new ResourceNotFoundException("Payment policy row is missing"));
    }

    private static PaymentPolicyResponse toResponse(PaymentPolicy p) {
        PaymentPolicyResponse r = new PaymentPolicyResponse();
        r.setDepositMode(p.getDepositMode());
        r.setDepositPercent(p.getDepositPercent());
        r.setDeadlineDaysBefore(p.getDeadlineDaysBefore());
        r.setAcceptOnlineLink(p.isAcceptOnlineLink());
        r.setAcceptBankTransfer(p.isAcceptBankTransfer());
        r.setAcceptCardOnSite(p.isAcceptCardOnSite());
        r.setAcceptCashOnSite(p.isAcceptCashOnSite());
        r.setAcceptCheque(p.isAcceptCheque());
        r.setNote(p.getNote());
        r.setUpdatedAt(p.getUpdatedAt());
        return r;
    }
}
