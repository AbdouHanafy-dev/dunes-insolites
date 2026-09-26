package com.camping.duneinsolite.config;

import com.camping.duneinsolite.model.CurrencyRates;
import com.camping.duneinsolite.repository.CurrencyRatesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * The rates the owner set in the back office, read at most every 30 seconds (every price
 * conversion asks for them) and dropped the moment they are edited. When nothing can be read the
 * caller falls back to the built-in values of {@link CurrencyConfig}, so a database hiccup never
 * makes a conversion fail.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CurrencyRatesStore {

    /** Three amounts worth the same: how much of each currency equals one another. */
    public record Amounts(BigDecimal eur, BigDecimal usd, BigDecimal tnd) {}

    private static final long TTL_NANOS = 30_000_000_000L;

    private final CurrencyRatesRepository repository;

    private volatile Optional<Amounts> cached = Optional.empty();
    private volatile long readAt = 0;
    private volatile boolean loaded = false;

    public Optional<Amounts> current() {
        long now = System.nanoTime();
        if (loaded && now - readAt < TTL_NANOS) return cached;
        try {
            cached = repository.findById(CurrencyRates.SINGLETON_ID)
                    .map(r -> new Amounts(r.getEurAmount(), r.getUsdAmount(), r.getTndAmount()));
        } catch (RuntimeException e) {
            log.warn("could not read the currency rates, using the built-in ones: {}", e.toString());
            cached = Optional.empty();
        }
        readAt = now;
        loaded = true;
        return cached;
    }

    /** Called right after an edit so the new rates apply at once. */
    public void invalidate() {
        loaded = false;
    }
}
