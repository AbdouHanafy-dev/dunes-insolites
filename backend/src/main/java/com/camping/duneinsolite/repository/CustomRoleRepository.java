package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.CustomRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomRoleRepository extends JpaRepository<CustomRole, String> {
    List<CustomRole> findAllByOrderByNameAsc();
}
