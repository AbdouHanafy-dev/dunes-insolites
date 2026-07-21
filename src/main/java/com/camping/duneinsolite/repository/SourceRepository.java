// SourceRepository.java
package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Source;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface SourceRepository extends JpaRepository<Source, UUID> {
    boolean existsByName(String name);
}