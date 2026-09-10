package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.GalleryImage;
import com.camping.duneinsolite.model.enums.CompanyType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GalleryImageRepository extends JpaRepository<GalleryImage, UUID> {

    List<GalleryImage> findAllByOrderByPositionAscCreatedAtAsc();

    List<GalleryImage> findAllByCompanyTypeOrderByPositionAscCreatedAtAsc(CompanyType companyType);

    boolean existsByCompanyType(CompanyType companyType);
}
