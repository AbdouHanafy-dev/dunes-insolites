package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.PaymentPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentPolicyRepository extends JpaRepository<PaymentPolicy, Long> {
}
