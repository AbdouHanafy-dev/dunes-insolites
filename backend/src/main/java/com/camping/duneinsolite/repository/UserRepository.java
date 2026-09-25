package com.camping.duneinsolite.repository;


import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // ── Used by auth flow ─────────────────────────────────────────────────
    // After Keycloak validates the JWT, we fetch the local user by email
    // to get userId, role, loyaltyPoints, etc.
    Optional<User> findByEmail(String email);

    // Used during registration to check if email already exists
    // before creating the user in Keycloak
    boolean existsByEmail(String email);

    // ── Used by admin/management ──────────────────────────────────────────
    List<User> findByRole(UserRole role);
    List<User> findAllByRole(UserRole role);
    List<User> findByRoleIn(List<UserRole> roles);

    // Deletion guard for CustomRoleServiceImpl - a role still attached to a
    // real account must not disappear out from under them.
    boolean existsByCustomRoleName(String customRoleName);
    long countByCustomRoleName(String customRoleName);

    // Loads user + remises in one query — used after create/update to return fresh data
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.remises WHERE u.userId = :userId")
    Optional<User> findByIdWithRemises(@Param("userId") UUID userId);

    // Combinable search used by the Clients & Partenaires admin page:
    // filters by role(s) and, optionally, a free-text term matched against name/email/phone.
    @Query("""
            SELECT u FROM User u
            WHERE u.role IN :roles
              AND u.email <> 'client-supprime@dunes-insolites.invalid'
              AND (:term = ''
                   OR LOWER(u.name) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(u.phone) LIKE LOWER(CONCAT('%', :term, '%')))
            """)
    Page<User> searchByRolesAndTerm(@Param("roles") List<UserRole> roles,
                                     @Param("term") String term,
                                     Pageable pageable);
}
