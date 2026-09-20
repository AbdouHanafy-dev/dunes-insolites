package com.camping.duneinsolite.config;

import com.camping.duneinsolite.dto.request.RegisterRequest;
import com.camping.duneinsolite.model.CancellationPolicy;
import com.camping.duneinsolite.model.Extra;
import com.camping.duneinsolite.model.ExtraTranslation;
import com.camping.duneinsolite.model.Photo;
import com.camping.duneinsolite.model.ProgramStep;
import com.camping.duneinsolite.model.Source;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.model.TourType;
import com.camping.duneinsolite.model.TourTypeTranslation;
import com.camping.duneinsolite.model.enums.ContentLocale;
import com.camping.duneinsolite.model.enums.UserRole;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    private final com.camping.duneinsolite.repository.NavigationItemRepository navigationItemRepository;
    private final com.camping.duneinsolite.repository.SpokenLanguageRepository spokenLanguageRepository;

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
        seedCircuitsNavItem();
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
        if (tourTypeRepository.existsByName(name)
                || tourTypeRepository.existsBySlug("bivouac-desert-tunisie")) return;

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
        seedExcursionTataouineChenini();
        seedTunisieOasisMontagneSahara();
        seedDepuisTunisCampSahara();
    }

    private void seedExcursionTataouineChenini() {
        String name = "Excursion d'une Journee : Djerba Vers Tataouine et Chenini a la Decouverte " +
                "du Desert Tunisien et des Lieux de Star Wars";
        if (tourRepository.existsByName(name)
                || tourRepository.existsBySlug("excursion-tataouine-chenini-desert-tunisien-star-wars")) return;

        tourRepository.save(Tour.builder()
                .name(name)
                // Legacy WordPress slug - Route Insolite's product per docs/SEO_PLAN.pdf's
                // territory split, kept verbatim. Now IS exposed publicly, on
                // dunes-insolites.com/circuits — see docs/OPEN-QUESTIONS.md
                // Q6's 18 Sep 2026 addendum for why that changed.
                .slug("excursion-tataouine-chenini-desert-tunisien-star-wars")
                .description("Decouvrez le charme authentique du sud tunisien avec cette excursion " +
                        "exceptionnelle de Djerba vers Tataouine et Chenini. Entre paysages desertiques " +
                        "fascinants, villages berberes perches, et sites iconiques de tournage de Star Wars, " +
                        "cette journee vous transporte dans un univers ou histoire et cinema se croisent.")
                .duration("1 Jour")
                .passengerAdultPrice(new BigDecimal("85.0"))
                .passengerChildPrice(new BigDecimal("45.0"))
                // Same note as above - partner rate defaulted to passenger price, adjust via Catalogue.
                .partnerAdultPrice(new BigDecimal("85.0"))
                .partnerChildPrice(new BigDecimal("45.0"))
                .tva(new BigDecimal("13.0"))
                .isActive(true)
                .build());
        log.info("Seed: created tour {}", name);
    }

    // Real content, transcribed verbatim (18 Sep 2026) from the business's own
    // live GetYourGuide listings (product refs 1065290 / 1447711) - the
    // business owner pasted the full page text directly rather than have
    // anything here invented, per CLAUDE.md's anti-fabrication rule. Photos
    // are the real ones the business owner supplied, moved from
    // frontend/public/images/{folder name} into
    // frontend/public/images/tours/{slug}/ with clean numbered filenames.
    private void seedTunisieOasisMontagneSahara() {
        String name = "Tunisie : 2 jours entre oasis de montagne et camp dans le desert du Sahara";
        if (tourRepository.existsByName(name)
                || tourRepository.existsBySlug("tunisie-2-jours-oasis-montagne-sahara")) return;

        // GetYourGuide only ever showed a single "Adulte x1" rate (127 EUR,
        // discounted from 159 EUR) - no separate child/partner rate was
        // published, so those default to the adult rate rather than an
        // invented discount, same convention as the tour above. Adjust via
        // Catalogue once a real child/partner rate exists.
        BigDecimal adultPrice = new BigDecimal("127.0");

        List<Photo> photos = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            photos.add(new Photo("/images/tours/tunisie-2-jours-oasis-montagne-sahara/0" + i + ".avif", null));
        }

        List<ProgramStep> steps = List.of(
                new ProgramStep("Prise en charge", "Tunis Clock Tower, Tunis ou Bab al-Bhar",
                        "3 points de prise en charge possibles - retour identique en fin de circuit."),
                new ProgramStep("Bus ou car - 2h", "Amphitheatre d'El Jem",
                        "Pause photos, visite guidee, temps libre. Site classe au patrimoine mondial de " +
                                "l'UNESCO, l'une des plus grandes arenes romaines au monde."),
                new ProgramStep("Bus ou car - 2h", "Matmata",
                        "Visite d'une maison berbere troglodyte (lieu de tournage Star Wars), dejeuner " +
                                "dans un restaurant local."),
                new ProgramStep("Bus ou car - 2h", "Camp Dunes Insolites",
                        "Installation en tente berbere privee, the a la menthe au coucher du soleil, " +
                                "demonstration du pain Mella cuit sous le sable, diner tunisien, " +
                                "divertissement folklorique et nuit sous les etoiles du Sahara. Activites " +
                                "optionnelles : balade a dos de chameau, quad, 4x4, sandboard."),
                new ProgramStep("Bus ou car - 2h", "Chott el Djerid",
                        "Visite et temps libre - le plus grand lac sale d'Afrique du Nord."),
                new ProgramStep("Bus ou car - 1h", "Oasis de Chebika",
                        "Visite et dejeuner - palmeraies, sources naturelles et canyons de l'oasis de " +
                                "montagne."),
                new ProgramStep("Bus ou car - 2h", "Kairouan",
                        "Visite - l'une des villes les plus sacrees de l'islam, site classe au patrimoine " +
                                "mondial de l'UNESCO."),
                new ProgramStep("Retour", "Tunis, Hammamet ou Sousse",
                        "Arrivee en debut de soiree, avec des souvenirs inoubliables de l'aventure dans " +
                                "le desert du Sahara.")
        );

        tourRepository.save(Tour.builder()
                .name(name)
                .slug("tunisie-2-jours-oasis-montagne-sahara")
                .description("Decouvrez le Sahara tunisien en 2 jours : El Jem, Matmata, le camp Dunes " +
                        "Insolites Desert Camp, le Chott el-Jerid, l'oasis de Chebika et Kairouan, avec " +
                        "une nuit inoubliable dans le desert.")
                .aboutText("Evadez-vous au coeur du sud de la Tunisie lors de cette inoubliable excursion " +
                        "de 2 jours dans le desert du Sahara, qui combine l'histoire romaine, la culture " +
                        "berbere, des paysages a couper le souffle et une nuit au Dunes Insolites Desert " +
                        "Camp, l'un des camps sahariens les plus authentiques de Tunisie.\n\n" +
                        "Jour 1 : El Jem, Matmata, camp dans le desert Dunes Insolites. Apres une prise " +
                        "en charge tot le matin a votre hotel de Tunis, Hammamet ou Sousse, partez vers " +
                        "le sud jusqu'au spectaculaire amphitheatre d'El Jem. Poursuivez jusqu'a Matmata, " +
                        "celebre pour ses maisons berberes troglodytes, avant de dejeuner dans un " +
                        "restaurant local. Rejoignez ensuite le Dunes Insolites Desert Camp pour une " +
                        "soiree traditionnelle et une nuit sous les etoiles du Sahara.\n\n" +
                        "Jour 2 : Chott El Jerid, Chebika, Kairouan. Apres le petit-dejeuner, traversez " +
                        "le Chott el-Jerid puis l'oasis de montagne de Chebika, avant de rejoindre " +
                        "Kairouan, ville sainte classee au patrimoine mondial de l'UNESCO, puis le retour " +
                        "vers Tunis, Hammamet ou Sousse en debut de soiree.")
                .duration("2 Jours")
                .location("Tunis")
                .meetingPoint("3 points de prise en charge : Tunis Clock Tower, Tunis, ou Bab al-Bhar - " +
                        "retour identique")
                .passengerAdultPrice(adultPrice)
                .passengerChildPrice(adultPrice)
                .partnerAdultPrice(adultPrice)
                .partnerChildPrice(adultPrice)
                .tva(new BigDecimal("13.0"))
                .isActive(true)
                .languages(spokenLanguages("Français", "Anglais", "Arabe"))
                .cancellationPolicy(new CancellationPolicy(true, 24))
                .coverPhotoUrl(photos.get(0).getUrl())
                .photos(photos)
                .highlights(List.of(
                        "Ressentez le frisson de l'aventure avec des balades a dos de chameau et du quad " +
                                "en option",
                        "Explorez les oasis epoustouflantes de Chebika",
                        "Savourez un diner traditionnel dans le desert sous les etoiles dans un camp du " +
                                "Sahara",
                        "Visitez l'impressionnant amphitheatre romain d'El Jem, classe au patrimoine " +
                                "mondial de l'UNESCO",
                        "Decouvrez la magie du Sahara avec une vue sur le coucher de soleil depuis les " +
                                "dunes"
                ))
                .includedItems(List.of(
                        "Transport climatise",
                        "Nuit au camp Dunes Insolites",
                        "2 dejeuners",
                        "Diner et petit-dejeuner au camp",
                        "Assistance locale au camp"
                ))
                .notIncludedItems(List.of(
                        "Activites supplementaires en option",
                        "Pourboires"
                ))
                .programSteps(steps)
                .build());
        log.info("Seed: created tour {}", name);
    }

    private void seedDepuisTunisCampSahara() {
        String name = "Depuis Tunis : 2 jours tout compris dans un camp du Sahara";
        if (tourRepository.existsByName(name)
                || tourRepository.existsBySlug("depuis-tunis-2-jours-camp-sahara")) return;

        // Same real-content sourcing note as seedTunisieOasisMontagneSahara()
        // above. GetYourGuide only showed a single "Adulte x1" rate (192 EUR,
        // discounted from 240 EUR) - no separate child/partner rate, same
        // default-to-adult convention, adjust via Catalogue once real.
        BigDecimal adultPrice = new BigDecimal("192.0");

        List<Photo> photos = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            photos.add(new Photo("/images/tours/depuis-tunis-2-jours-camp-sahara/0" + i + ".avif", null));
        }

        List<ProgramStep> steps = List.of(
                new ProgramStep("Jour 1", "Nord de la Tunisie, El Jem, Matmata, Douz, camp dans le Sahara",
                        "Prise en charge a l'hotel, route vers le sud avec arrets, arrivee et nuit au " +
                                "camp Dunes Insolites."),
                new ProgramStep("Jour 2", "Sabria, Kebili, Chott Jerid, Chebika, Kairouan, retour",
                        "Depart du camp, traversee du Chott Jerid et de l'oasis de Chebika, halte a " +
                                "Kairouan, puis retour a l'hotel.")
        );

        tourRepository.save(Tour.builder()
                .name(name)
                .slug("depuis-tunis-2-jours-camp-sahara")
                .description("Decouvrez le desert du Sahara lors d'une aventure de 2 jours au depart de " +
                        "Sabria. Passez la nuit dans une tente traditionnelle, profitez d'une balade a " +
                        "dos de chameau et d'une aventure en quad, et savourez des repas locaux.")
                .duration("2 Jours")
                .location("Tunis")
                .meetingPoint("Prise en charge et retour directement a votre hotel (Tunis, Hammamet, " +
                        "Sousse)")
                .passengerAdultPrice(adultPrice)
                .passengerChildPrice(adultPrice)
                .partnerAdultPrice(adultPrice)
                .partnerChildPrice(adultPrice)
                .tva(new BigDecimal("13.0"))
                .isActive(true)
                .languages(spokenLanguages("Français", "Anglais"))
                .cancellationPolicy(new CancellationPolicy(true, 24))
                .coverPhotoUrl(photos.get(0).getUrl())
                .photos(photos)
                .highlights(List.of(
                        "Decouvrez le desert du Sahara lors d'une aventure de 2 jours au depart de Sabria",
                        "Profitez d'une balade a dos de chameau et d'une aventure en quad dans les dunes " +
                                "du Sahara",
                        "Passez la nuit dans une tente traditionnelle du Sahara et profitez de " +
                                "l'hospitalite locale",
                        "Savourez un diner traditionnel et un petit-dejeuner dans le camp du desert"
                ))
                .includedItems(List.of(
                        "Prise en charge et retour directement a votre hotel",
                        "Transport en vehicule confortable et climatise pendant les 2 jours",
                        "Chauffeur / accompagnement pendant le circuit",
                        "1 nuit dans une tente authentique au Camp Dunes Insolites",
                        "Balade de 30 minutes a dos de chameau",
                        "Balade de 30 minutes en quad",
                        "Sandboard",
                        "Divertissement folklorique traditionnel",
                        "Spectacle equestre",
                        "Demonstration de pain de sable",
                        "Dejeuner le 1er jour",
                        "Diner traditionnel au camp",
                        "Petit-dejeuner et dejeuner le jour 2",
                        "Visites mentionnees dans l'itineraire",
                        "Organisation complete et assistance pendant toute l'excursion"
                ))
                .notIncludedItems(List.of(
                        "Boissons en dehors des repas inclus",
                        "Depenses personnelles",
                        "Pourboires",
                        "Toute activite supplementaire non mentionnee dans les services inclus"
                ))
                .programSteps(steps)
                .build());
        log.info("Seed: created tour {}", name);
    }

    private void seedExtras() {
        String name = "30 min Quad";
        if (extraRepository.existsByName(name) || extraRepository.existsBySlug("quad-desert")) return;

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

    // Circuits went live on the vitrine 18 Sep 2026 (business owner,
    // explicit - see docs/OPEN-QUESTIONS.md Q6's addendum) after the other
    // six nav items below were already seeded via scripts/seed-navigation.py
    // (a one-off HTTP script, not idempotent - NavigationItem has no unique
    // constraint). This one lives here instead so it's real, versioned, and
    // reaches every environment - including the VPS - on the next normal
    // deploy, with no manual script/admin-login step. Labels match
    // frontend/messages/{locale}.json's nav.circuits key exactly.
    private void seedCircuitsNavItem() {
        record NavLabel(com.camping.duneinsolite.model.enums.PageLocale locale, String label) {}
        List<NavLabel> labels = List.of(
                new NavLabel(com.camping.duneinsolite.model.enums.PageLocale.FR, "Circuits"),
                new NavLabel(com.camping.duneinsolite.model.enums.PageLocale.EN, "Circuits"),
                new NavLabel(com.camping.duneinsolite.model.enums.PageLocale.DE, "Rundreisen"),
                new NavLabel(com.camping.duneinsolite.model.enums.PageLocale.IT, "Circuiti"),
                new NavLabel(com.camping.duneinsolite.model.enums.PageLocale.DA, "Ture"),
                new NavLabel(com.camping.duneinsolite.model.enums.PageLocale.AR, "الرحلات")
        );

        for (NavLabel l : labels) {
            if (navigationItemRepository.existsByUrlAndLocaleAndCompanyType(
                    "/circuits", l.locale(), com.camping.duneinsolite.model.enums.CompanyType.DUNES_INSOLITES)) {
                continue;
            }
            navigationItemRepository.save(com.camping.duneinsolite.model.NavigationItem.builder()
                    .label(l.label())
                    .url("/circuits")
                    .locale(l.locale())
                    .companyType(com.camping.duneinsolite.model.enums.CompanyType.DUNES_INSOLITES)
                    .displayOrder(6)
                    .menuType(com.camping.duneinsolite.model.enums.NavMenuType.NONE)
                    .build());
            log.info("Seed: added Circuits nav item [{}]", l.locale());
        }
    }

    // Looks up SpokenLanguage rows by name (V20 seeds Français/Anglais/Arabe
    // among others) - Tour.languages is the admin-managed catalog now, not
    // a hardcoded enum, so seed data references it by name like any caller would.
    private Set<com.camping.duneinsolite.model.SpokenLanguage> spokenLanguages(String... names) {
        Set<com.camping.duneinsolite.model.SpokenLanguage> result = new java.util.HashSet<>();
        for (String name : names) {
            spokenLanguageRepository.findAllByOrderByNameAsc().stream()
                    .filter(l -> l.getName().equals(name))
                    .findFirst()
                    .ifPresent(result::add);
        }
        return result;
    }
}
