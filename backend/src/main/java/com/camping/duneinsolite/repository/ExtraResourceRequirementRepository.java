package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.ExtraResourceRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ExtraResourceRequirementRepository extends JpaRepository<ExtraResourceRequirement, UUID> {}
