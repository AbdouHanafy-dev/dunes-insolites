package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.CampingSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CampingSettingsRepository extends JpaRepository<CampingSettings, Long> {
}
