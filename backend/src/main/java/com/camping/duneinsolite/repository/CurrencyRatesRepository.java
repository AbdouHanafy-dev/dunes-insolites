package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.CurrencyRates;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CurrencyRatesRepository extends JpaRepository<CurrencyRates, Short> {
}
