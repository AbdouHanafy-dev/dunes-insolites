package com.camping.duneinsolite.repository;

import com.camping.duneinsolite.model.Redirect;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RedirectRepository extends JpaRepository<Redirect, java.util.UUID> {

    List<Redirect> findAllByOrderByFromPathAsc();

    Optional<Redirect> findByFromPath(String fromPath);

    boolean existsByFromPath(String fromPath);
}
