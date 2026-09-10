package com.camping.duneinsolite.config;

import com.camping.duneinsolite.dto.request.RegisterRequest;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.ExtraTranslation;
import com.camping.duneinsolite.model.Source;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.TourTypeTranslation;
import com.camping.duneinsolite.model.enums.ContentLocale;
import com.camping.duneinsolite.model.enums.UserRole;

import java.util.List;
import java.util.Map;
import com.camping.duneinsolite.repository.ExtraRepository;
import com.camping.duneinsolite.repository.SourceRepository;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.repository.TourTypeRepository;
import com.camping.duneinsolite.repository.UserRepository;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
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
    private final com.camping.duneinsolite.repository.GalleryImageRepository galleryImageRepository;

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
        seedGallery();
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

        // The role is passed as an argument, not carried on the request — see
        // KeycloakUserSyncService.registerUser. The seeder is trusted server-side
        // code, so it is allowed to ask for ADMIN/CAMPING; the register endpoint
        // is not.
        keycloakUserSyncService.registerUser(request, role);
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

        TourType tourType = tourTypeRepository.save(TourType.builder()
                .name(name)
                // Legacy WordPress slug - keep verbatim, it carries the ranking (docs/SEO_PLAN.pdf).
                .slug("bivouac-desert-tunisie")
                .description("Decouvrez une experience inoubliable lors de notre excursion d'une nuitee " +
                        "en bivouac dans le desert, au depart du campement Dunes Insolites a Sabria Kebili Tunisie.")
                .duration("1 Nuitee")
                .passengerAdultPrice(new java.math.BigDecimal("95.0"))
                .passengerChildPrice(new java.math.BigDecimal("50.0"))
                // Partner (wholesale) pricing wasn't available to seed accurately - defaulted to
                // match passenger price for now. Adjust the real partner rate via Catalogue.
                .partnerAdultPrice(new java.math.BigDecimal("95.0"))
                .partnerChildPrice(new java.math.BigDecimal("50.0"))
                .tva(new java.math.BigDecimal("13.0"))
                .isActive(true)
                .build());

        // Matches the copy already translated on the frontend for this same
        // slug (lib/data/stays-i18n) - kept in sync by hand until an admin
        // translation UI exists.
        Map<ContentLocale, String[]> bivouacTranslations = Map.of(
                ContentLocale.EN, new String[]{"Bivouac Under the Stars",
                        "No walls, no electricity — a rustic camp set up fresh each evening on a high dune, " +
                                "mattresses under the stars or a simple tent if the wind picks up."},
                ContentLocale.DE, new String[]{"Biwak unter den Sternen",
                        "Keine Wände, kein Strom — ein rustikales Lager, das jeden Abend frisch auf einer hohen " +
                                "Düne aufgebaut wird, Matratzen unter den Sternen oder ein einfaches Zelt, falls der Wind auffrischt."},
                ContentLocale.IT, new String[]{"Bivacco sotto le stelle",
                        "Niente pareti, niente elettricità — un campo rustico allestito ogni sera su una duna " +
                                "alta, materassi sotto le stelle o una tenda semplice se si alza il vento."},
                ContentLocale.DA, new String[]{"Bivuak under stjernerne",
                        "Ingen vægge, ingen elektricitet — en rustik lejr, der sættes op på ny hver aften på en " +
                                "høj klit, madrasser under stjernerne eller et enkelt telt, hvis vinden tager til."},
                ContentLocale.AR, new String[]{"مبيت تحت النجوم",
                        "لا جدران، لا كهرباء — مخيم بسيط يُنصب من جديد كل مساء على كثيب مرتفع، مراتب تحت " +
                                "النجوم أو خيمة بسيطة إن اشتدت الرياح."}
        );
        bivouacTranslations.forEach((locale, text) -> tourType.getTranslations().add(
                TourTypeTranslation.builder().tourType(tourType).locale(locale).name(text[0]).description(text[1]).build()));
        tourTypeRepository.save(tourType);
        log.info("Seed: created tour type {}", name);
    }

    private void seedTours() {
        String name = "Excursion d'une Journee : Djerba Vers Tataouine et Chenini a la Decouverte " +
                "du Desert Tunisien et des Lieux de Star Wars";
        if (tourRepository.existsByName(name)) return;

        tourRepository.save(Tour.builder()
                .name(name)
                // Legacy WordPress slug - Route Insolite's product per docs/SEO_PLAN.pdf's
                // territory split, kept verbatim; not exposed on the Dunes public API.
                .slug("excursion-tataouine-chenini-desert-tunisien-star-wars")
                .description("Decouvrez le charme authentique du sud tunisien avec cette excursion " +
                        "exceptionnelle de Djerba vers Tataouine et Chenini. Entre paysages desertiques " +
                        "fascinants, villages berberes perches, et sites iconiques de tournage de Star Wars, " +
                        "cette journee vous transporte dans un univers ou histoire et cinema se croisent.")
                .duration("1 Jour")
                .passengerAdultPrice(new java.math.BigDecimal("85.0"))
                .passengerChildPrice(new java.math.BigDecimal("45.0"))
                // Same note as above - partner rate defaulted to passenger price, adjust via Catalogue.
                .partnerAdultPrice(new java.math.BigDecimal("85.0"))
                .partnerChildPrice(new java.math.BigDecimal("45.0"))
                .tva(new java.math.BigDecimal("13.0"))
                .isActive(true)
                .build());
        log.info("Seed: created tour {}", name);
    }

    private void seedExtras() {
        String name = "30 min Quad";
        if (extraRepository.existsByName(name)) return;

        Extra extra = extraRepository.save(Extra.builder()
                .name(name)
                // Legacy WordPress slug - keep verbatim, it carries the ranking (docs/SEO_PLAN.pdf).
                .slug("quad-desert")
                .description("Session de quad de 30 minutes dans le desert autour du campement.")
                .duration("30 minute")
                // Best-effort placeholder - verify/adjust the real unit price via Catalogue.
                .unitPrice(new java.math.BigDecimal("35.0"))
                .tva(new java.math.BigDecimal("13.0"))
                .isActive(true)
                .build());

        // Matches the copy already translated on the frontend for this same
        // slug (lib/data/activities-i18n) - kept in sync by hand until an
        // admin translation UI exists.
        Map<ContentLocale, String[]> quadTranslations = Map.of(
                ContentLocale.EN, new String[]{"Quad Safari",
                        "Open-throttle laps across the sand sea with a lead rider and full kit."},
                ContentLocale.DE, new String[]{"Quad-Safari",
                        "Fahrten mit Vollgas über das Sandmeer mit einem Vorausfahrer und kompletter Ausrüstung."},
                ContentLocale.IT, new String[]{"Safari in quad",
                        "Giri a tutta velocità sul mare di sabbia con una guida in testa e attrezzatura completa."},
                ContentLocale.DA, new String[]{"Quad-safari",
                        "Fuld gas hen over sandhavet med en forankørende guide og fuldt udstyr."},
                ContentLocale.AR, new String[]{"رحلة سفاري بالدراجة الرباعية",
                        "جولات بأقصى سرعة عبر بحر الرمال برفقة مرشد يقود المجموعة وتجهيزات كاملة."}
        );
        quadTranslations.forEach((locale, text) -> extra.getTranslations().add(
                ExtraTranslation.builder().extra(extra).locale(locale).name(text[0]).description(text[1]).build()));
        extraRepository.save(extra);
        log.info("Seed: created extra {}", name);
    }

    // ─────────────────────────────────────────────────────────────
    // GALLERY — vitrine photos, previously hardcoded in the frontend
    // (lib/data/gallery.ts). Alt text kept in English to match the
    // frontend's galleryGrid.alt translation keys; images are the ones
    // already shipped in frontend/public/images.
    // ─────────────────────────────────────────────────────────────

    private void seedGallery() {
        if (galleryImageRepository.count() > 0) return;

        record Photo(String url, String alt, String tag, boolean tall) { }
        List<Photo> photos = List.of(
                new Photo("/images/hero-combined.jpg", "Camel, quads and sandboarding on one dune", "All", true),
                new Photo("/images/camel.jpg", "Camel trek at golden hour", "Camel Trek", false),
                new Photo("/images/quad.jpg", "Quad bikes crossing the sand sea", "Quad Safari", false),
                new Photo("/images/gate.jpg", "The lantern-lit Sabria gate", "The Gate", true),
                new Photo("/images/sandboard.jpg", "Sandboarder carving a dune face", "Sandboarding", false)
        );

        int position = 0;
        for (Photo p : photos) {
            galleryImageRepository.save(com.camping.duneinsolite.model.GalleryImage.builder()
                    .imageUrl(p.url())
                    .alt(p.alt())
                    .tag(p.tag())
                    .tall(p.tall())
                    .position(position++)
                    .companyType(com.camping.duneinsolite.model.enums.CompanyType.DUNES_INSOLITES)
                    .build());
        }
        log.info("Seed: created {} gallery photos", photos.size());
    }
}
