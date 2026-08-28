package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ContentBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContentBlockRepository extends JpaRepository<ContentBlock, UUID> {
    List<ContentBlock> findAllByOrderByLabelAsc();
}
