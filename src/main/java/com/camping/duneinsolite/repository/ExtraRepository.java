package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Extra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExtraRepository extends JpaRepository<Extra, UUID> {
    List<Extra> findByIsActiveTrue();
}