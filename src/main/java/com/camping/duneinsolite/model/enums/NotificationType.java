package com.camping.duneinsolite.model.enums;

public enum NotificationType {
    RESERVATION_CREATED,
    RESERVATION_CONFIRMED,
    RESERVATION_CANCELLED,
    RESERVATION_REJECTED,
    RESERVATION_UPDATED,
    PAYMENT_RECEIVED,
    PAYMENT_COMPLETED,   // ← NEW — fired when totalAmount + totalExtrasAmount both reach 0
    INVOICE_SENT,
    PROMO_CODE,
    STAFF_ASSIGNED,
    STAFF_UPDATED,
    GENERAL

}
