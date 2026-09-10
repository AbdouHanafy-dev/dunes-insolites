package com.camping.duneinsolite.money;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * The single monetary rounding policy for the platform, and the only place
 * money arithmetic is performed.
 *
 * <p>Tunisian invoicing works to three decimals — the millime. Every monetary
 * amount that leaves a calculation is rounded here, to {@code SCALE} decimals
 * with {@code MODE}.
 *
 * <p><b>F-4 (accountant) — not yet confirmed.</b> {@code HALF_UP} at scale 3 is
 * the convention this codebase has always used. It is isolated here: the
 * accountant's ruling changes {@code SCALE} / {@code MODE} in this class and
 * nothing else. Do not scatter {@code setScale(...)} or {@code new BigDecimal(double)}
 * anywhere — call these helpers.
 */
public final class Money {

    /** Millime precision. */
    public static final int SCALE = 3;

    /** PENDING F-4 confirmation — see class javadoc. */
    public static final RoundingMode MODE = RoundingMode.HALF_UP;

    /** Working precision for divisions before the final rounding to SCALE. */
    private static final int WORKING_SCALE = SCALE + 4;

    public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(SCALE, MODE);

    private Money() {}

    // ── coercion ─────────────────────────────────────────────────────────

    /** Rounds to the millime. Null-safe: null → null. */
    public static BigDecimal round(BigDecimal amount) {
        return amount == null ? null : amount.setScale(SCALE, MODE);
    }

    /** A monetary value, rounded to the millime. Null → null. */
    public static BigDecimal of(BigDecimal amount) {
        return round(amount);
    }

    /** Parses a decimal string to a monetary value (never {@code new BigDecimal(double)}). */
    public static BigDecimal of(String amount) {
        return amount == null ? null : round(new BigDecimal(amount));
    }

    /** null → {@link #ZERO}, otherwise the value rounded to the millime. */
    public static BigDecimal nz(BigDecimal amount) {
        return amount == null ? ZERO : round(amount);
    }

    // ── arithmetic (all round the result once) ───────────────────────────

    public static BigDecimal add(BigDecimal... amounts) {
        BigDecimal sum = BigDecimal.ZERO;
        for (BigDecimal a : amounts) sum = sum.add(a == null ? BigDecimal.ZERO : a);
        return round(sum);
    }

    public static BigDecimal subtract(BigDecimal a, BigDecimal b) {
        return round(nz(a).subtract(nz(b)));
    }

    /** {@code amount × count}. Null amount → null. */
    public static BigDecimal multiply(BigDecimal amount, long count) {
        return amount == null ? null : round(amount.multiply(BigDecimal.valueOf(count)));
    }

    public static BigDecimal multiply(BigDecimal amount, BigDecimal factor) {
        if (amount == null || factor == null) return null;
        return round(amount.multiply(factor));
    }

    /** {@code amount ÷ divisor}, working precision then rounded. */
    public static BigDecimal divide(BigDecimal amount, BigDecimal divisor) {
        if (amount == null || divisor == null || divisor.signum() == 0) return null;
        return round(amount.divide(divisor, WORKING_SCALE, MODE));
    }

    /** Sum of {@code getTotalPrice()}-style values (nulls treated as zero). */
    public static BigDecimal sum(Iterable<BigDecimal> amounts) {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal a : amounts) total = total.add(a == null ? BigDecimal.ZERO : a);
        return round(total);
    }

    // ── line totals ──────────────────────────────────────────────────────

    /** {@code unitPrice × units × nights}, rounded once at the end. */
    public static BigDecimal lineTotal(BigDecimal unitPrice, long units, long nights) {
        if (unitPrice == null) return null;
        return round(unitPrice
                .multiply(BigDecimal.valueOf(Math.max(units, 0)))
                .multiply(BigDecimal.valueOf(Math.max(nights, 1))));
    }

    public static BigDecimal lineTotal(BigDecimal unitPrice, int units, int nights) {
        return lineTotal(unitPrice, (long) units, (long) nights);
    }

    // ── tax (TTC prices, HT = TTC / (1 + rate/100)) ──────────────────────

    /**
     * Tax-exclusive (HT) amount for a tax-inclusive (TTC) amount and a
     * percentage rate. {@code htFromTtc(120, 20) == 100}. Rate 0/null → TTC.
     */
    public static BigDecimal htFromTtc(BigDecimal ttc, BigDecimal ratePercent) {
        if (ttc == null) return null;
        if (ratePercent == null || ratePercent.signum() == 0) return round(ttc);
        BigDecimal divisor = BigDecimal.ONE.add(ratePercent.movePointLeft(2));
        return round(ttc.divide(divisor, WORKING_SCALE, MODE));
    }

    /** The tax portion of a TTC amount: {@code ttc − htFromTtc(ttc, rate)}. */
    public static BigDecimal taxFromTtc(BigDecimal ttc, BigDecimal ratePercent) {
        if (ttc == null) return null;
        return round(ttc.subtract(htFromTtc(ttc, ratePercent)));
    }

    // ── comparison (scale-insensitive) ──────────────────────────────────

    public static boolean isZeroOrNull(BigDecimal a) {
        return a == null || a.signum() == 0;
    }

    public static boolean isPositive(BigDecimal a) {
        return a != null && a.signum() > 0;
    }

    /** Numeric equality (ignores scale) — use instead of {@code equals()}. */
    public static boolean eq(BigDecimal a, BigDecimal b) {
        return nz(a).compareTo(nz(b)) == 0;
    }

    public static boolean lt(BigDecimal a, BigDecimal b) {
        return nz(a).compareTo(nz(b)) < 0;
    }

    public static boolean gt(BigDecimal a, BigDecimal b) {
        return nz(a).compareTo(nz(b)) > 0;
    }

    public static boolean gte(BigDecimal a, BigDecimal b) {
        return nz(a).compareTo(nz(b)) >= 0;
    }
}
