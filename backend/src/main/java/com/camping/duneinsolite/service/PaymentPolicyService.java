package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.PaymentPolicyRequest;
import com.camping.duneinsolite.dto.response.PaymentPolicyResponse;

public interface PaymentPolicyService {
    PaymentPolicyResponse getPolicy();
    PaymentPolicyResponse updatePolicy(PaymentPolicyRequest request);
}
