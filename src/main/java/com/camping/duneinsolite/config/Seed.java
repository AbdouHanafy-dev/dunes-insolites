package com.camping.duneinsolite.config;

import com.camping.duneinsolite.dto.request.RegisterRequest;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.Source;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.SourceRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.impl.KeycloakUserSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Runs once every time the backend starts. Each seed step checks whether its
 * data already exists before inserting, so this is safe to leave running on
 * every restart/rebuild forever — it only ever does something the first time.
 *
 * Account credentials (SEED_ADMIN_EMAIL/PASSWORD, SEED_CAMPING_EMAIL/PASSWORD)
 * come from environment variables, never hardcoded here, so nothing sensitive
 * ends up in git — set the real values in .env on each server. If they're not
 * set, that account is simply skipped, not an error.
 *
 * Catalog data (sources/tour types/tours/extras) isn't sensitive, so it's
 * plain committed data below - adjust or extend directly in this file.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class Seed implements CommandLineRunner {

    private final UserRepository userRepository;
    private final KeycloakUserSyncService keycloakUserSyncService;
    private final SourceRepository sourceRepository;
    private final TourTypeRepository tourTypeRepository;
    private final TourRepository tourRepository;
    private final ExtraRepository extraRepository;

    @Value("${seed.admin.email:}")
    private String adminEmail;
    @Value("${seed.admin.password:}")
    private String adminPassword;

    @Value("${seed.camping.email:}")
    private String campingEmail;
    @Value("${seed.camping.password:}")
    private String campingPassword;

    @Override
    public void run(String... args) {
        seedAccount(adminEmail, adminPassword, "Admin", UserRole.ADMIN);
        seedAccount(campingEmail, campingPassword, "Camping", UserRole.CAMPING);

        seedSources();
        seedTourTypes();
        seedTours();
        seedExtras();
    }

    // ─────────────────────────────────────────────────────────────
    // ACCOUNTS — credentials only ever come from environment variables
    // ─────────────────────────────────────────────────────────────

    private void seedAccount(String email, String password, String label, UserRole role) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.info("Seed: no {} account configured (set SEED_{}_EMAIL / SEED_{}_PASSWORD to enable) — skipping",
                    label, role.name(), role.name());
            return;
        }
        if (userRepository.existsByEmail(email)) {
            log.info("Seed: {} account {} already exists — skipping", label, email);
            return;
        }

        RegisterRequest request = new RegisterRequest();
        request.setName(label);
        request.setEmail(email);
        request.setPassword(password);
        request.setPhone("00000000");
        request.setRole(role);

        keycloakUserSyncService.registerUser(request);
        log.info("Seed: created {} account {}", label, email);
    }

    // ─────────────────────────────────────────────────────────────
    // CATALOG — not sensitive, plain data
    // ─────────────────────────────────────────────────────────────

    private void seedSources() {
        for (String name : new String[]{"Facebook", "Instagram", "WhatsApp", "Site web", "Bouche à oreille"}) {
            if (sourceRepository.existsByName(name)) continue;
            sourceRepository.save(Source.builder().name(name).build());
            log.info("Seed: created source {}", name);
        }
    }

    private void seedTourTypes() {
        String name = "Une Nuitee En Bivouac a Sabria Tunisie";
        if (tourTypeRepository.existsByName(name)) return;

        tourTypeRepository.save(TourType.builder()
                .name(name)
                .description("Decouvrez une experience inoubliable lors de notre excursion d'une nuitee " +
                        "en bivouac dans le desert, au depart du campement Dunes Insolites a Sabria Kebili Tunisie.")
                .duration("1 Nuitee")
                .passengerAdultPrice(95.0)
                .passengerChildPrice(50.0)
                // Partner (wholesale) pricing wasn't available to seed accurately - defaulted to
                // match passenger price for now. Adjust the real partner rate via Catalogue.
                .partnerAdultPrice(95.0)
                .partnerChildPrice(50.0)
                .tva(13.0)
                .isActive(true)
                .build());
        log.info("Seed: created tour type {}", name);
    }

    private void seedTours() {
        String name = "Excursion d'une Journee : Djerba Vers Tataouine et Chenini a la Decouverte " +
                "du Desert Tunisien et des Lieux de Star Wars";
        if (tourRepository.existsByName(name)) return;

        tourRepository.save(Tour.builder()
                .name(name)
                .description("Decouvrez le charme authentique du sud tunisien avec cette excursion " +
                        "exceptionnelle de Djerba vers Tataouine et Chenini. Entre paysages desertiques " +
                        "fascinants, villages berberes perches, et sites iconiques de tournage de Star Wars, " +
                        "cette journee vous transporte dans un univers ou histoire et cinema se croisent.")
                .duration("1 Jour")
                .passengerAdultPrice(85.0)
                .passengerChildPrice(45.0)
                // Same note as above - partner rate defaulted to passenger price, adjust via Catalogue.
                .partnerAdultPrice(85.0)
                .partnerChildPrice(45.0)
                .tva(13.0)
                .isActive(true)
                .build());
        log.info("Seed: created tour {}", name);
    }

    private void seedExtras() {
        String name = "30 min Quad";
        if (extraRepository.existsByName(name)) return;

        extraRepository.save(Extra.builder()
                .name(name)
                .description("Session de quad de 30 minutes dans le desert autour du campement.")
                .duration("30 minute")
                // Best-effort placeholder - verify/adjust the real unit price via Catalogue.
                .unitPrice(35.0)
                .tva(13.0)
                .isActive(true)
                .build());
        log.info("Seed: created extra {}", name);
    }
}
