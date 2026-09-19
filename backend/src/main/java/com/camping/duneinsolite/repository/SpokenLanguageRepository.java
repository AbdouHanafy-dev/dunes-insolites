package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.SpokenLanguage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SpokenLanguageRepository extends JpaRepository<SpokenLanguage, UUID> {
    List<SpokenLanguage> findAllByActiveTrueOrderByNameAsc();
    List<SpokenLanguage> findAllByOrderByNameAsc();
}
