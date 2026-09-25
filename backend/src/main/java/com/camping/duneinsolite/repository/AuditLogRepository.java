package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.AuditLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLogEntry, UUID>, JpaSpecificationExecutor<AuditLogEntry> {

    /** For the filter dropdown: which kinds of record appear in the log. */
    @Query("select distinct a.entityType from AuditLogEntry a where a.entityType is not null order by a.entityType")
    List<String> findDistinctEntityTypes();
}
