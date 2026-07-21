package com.camping.duneinsolite.repository.specification;

import com.camping.duneinsolite.model.Reservation;
import com.camping.duneinsolite.model.enums.ReservationStatus;
import com.camping.duneinsolite.model.enums.ReservationType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public final class ReservationSpecification {

    private ReservationSpecification() {
    }

    public static Specification<Reservation> hasStatus(ReservationStatus status) {
        if (status == null) return null;
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<Reservation> hasUserNameLike(String name) {
        if (name == null || name.isBlank()) return null;
        String pattern = "%" + name.toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("user").get("name")), pattern);
    }

    public static Specification<Reservation> onDate(LocalDate date) {
        if (date == null) return null;
        return (root, query, cb) -> {
            Predicate hebergementOnDate = cb.and(
                    cb.equal(root.get("reservationType"), ReservationType.HEBERGEMENT),
                    cb.equal(root.get("checkInDate"), date)
            );
            Predicate otherOnDate = cb.and(
                    cb.notEqual(root.get("reservationType"), ReservationType.HEBERGEMENT),
                    cb.equal(root.get("serviceDate"), date)
            );
            return cb.or(hebergementOnDate, otherOnDate);
        };
    }

    public static Specification<Reservation> combine(ReservationStatus status, String name, LocalDate date) {
        Specification<Reservation> spec = (root, query, cb) -> cb.conjunction();
        Specification<Reservation> statusSpec = hasStatus(status);
        Specification<Reservation> nameSpec = hasUserNameLike(name);
        Specification<Reservation> dateSpec = onDate(date);

        if (statusSpec != null) spec = spec.and(statusSpec);
        if (nameSpec != null) spec = spec.and(nameSpec);
        if (dateSpec != null) spec = spec.and(dateSpec);

        return spec;
    }
}
