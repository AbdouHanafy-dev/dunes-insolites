package com.camping.duneinsolite.tour;

import com.camping.duneinsolite.dto.request.TourRequest;
import com.camping.duneinsolite.dto.response.TourResponse;
import com.camping.duneinsolite.mapper.publicapi.PublicTourMapper;
import com.camping.duneinsolite.model.Tour;
import com.camping.duneinsolite.repository.TourRepository;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.TourService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.rabbitmq.RabbitMQContainer;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The admin's circuit wizard submits one JSON body at the last step; creating the
 * circuit from exactly that body must succeed (it answered "other records still
 * depend on it" instead).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false"
})
@Testcontainers
class TourWizardCreateIT {

    @Container static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");
    @Container static final RabbitMQContainer RABBIT = new RabbitMQContainer("rabbitmq:3-management");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", POSTGRES::getUsername);
        r.add("spring.datasource.password", POSTGRES::getPassword);
        r.add("spring.rabbitmq.host", RABBIT::getHost);
        r.add("spring.rabbitmq.port", RABBIT::getAmqpPort);
        r.add("spring.rabbitmq.username", RABBIT::getAdminUsername);
        r.add("spring.rabbitmq.password", RABBIT::getAdminPassword);
    }

    @MockitoBean JavaMailSender mailSender;
    @MockitoBean KeycloakUserSyncService keycloakUserSyncService;

    @Autowired TourService tourService;
    @Autowired TourRepository tourRepository;
    @Autowired PublicTourMapper publicTourMapper;
    @Autowired TransactionTemplate tx;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private static final String WIZARD_BODY = """
        {"name":"nom de circuit 1","description":"description courte 1","duration":"3 jours / 2 nuits",
         "location":"Hammamet","groupSizeType":"TOUTES_TAILLES","aboutText":null,
         "highlights":["coucher de soleil"],"includedItems":[],"notIncludedItems":[],"keywords":[],
         "programSteps":[
           {"label":"repere 1","title":"titre 1","description":"","segmentType":"ACTIVITY","optionalSegment":false,"durationMinutes":null},
           {"label":"repere2","title":"repere 2 titre","description":"","segmentType":"ACTIVITY","optionalSegment":false,"durationMinutes":null},
           {"label":"rerper 3","title":"titre repere 3","description":"","segmentType":"ACTIVITY","optionalSegment":false,"durationMinutes":null}],
         "guideType":"NONE","overnightsAtCamp":false,"foodIncluded":false,"meals":[],"drinksIncluded":false,
         "dietaryRestrictions":[],"transportIncluded":false,"transportModes":[],"notSuitableFor":[],"notAllowed":[],
         "animalsAccepted":false,"petPolicyNote":null,"mustBring":[],"goodToKnow":null,"emergencyPhone":null,
         "ticketInfo":null,"meetingPoint":null,"languageIds":[],
         "cancellationPolicy":{"freeCancellation":false,"hoursBeforeDeadline":null},
         "coverPhotoUrl":"https://api.dunesinsolites.com/media/cover.jpg",
         "photos":[{"url":"https://api.dunesinsolites.com/media/g1.jpg","caption":""}],
         "translations":[{"locale":"DE","name":"Rundreise 1","description":"Kurzbeschreibung 1"},
                         {"locale":"EN","name":"circuit 1","description":"short description 1"}],
         "passengerAdultPrice":200,"salePriceAdult":null,"passengerChildPrice":100,"passengerInfantPrice":0,
         "partnerAdultPrice":0,"partnerChildPrice":0,"tva":13,"isActive":true,
         "insuranceConfirmed":false,"complianceConfirmed":false,"copyrightConfirmed":false}
        """;

    @Test
    void creatingACircuitFromTheWizardBodySucceeds() throws Exception {
        TourRequest request = objectMapper.readValue(WIZARD_BODY, TourRequest.class);
        Throwable failure = null;
        TourResponse created = null;
        try {
            created = tourService.createTour(request);
        } catch (Throwable t) {
            failure = t;
            Throwable root = t;
            while (root.getCause() != null && root.getCause() != root) root = root.getCause();
            System.out.println("WIZARD-CREATE-FAILURE: " + t.getClass().getName() + " :: " + root.getMessage());
        }
        assertThat(failure).isNull();
        assertThat(created.getName()).isEqualTo("nom de circuit 1");
    }

    @Test
    void aCircuitsPracticalTextsAreStoredPerLanguageAndServedInTheVisitorsLanguage() throws Exception {
        String body = WIZARD_BODY
                .replace("\"name\":\"nom de circuit 1\"", "\"name\":\"circuit pratique " + System.nanoTime() + "\"")
                .replace("\"petPolicyNote\":null", "\"petPolicyNote\":\"Chiens interdits\"")
                .replace("\"mustBring\":[]", "\"mustBring\":[\"Chapeau\",\"Creme solaire\"]")
                .replace("\"goodToKnow\":null", "\"goodToKnow\":\"Prevoir des vetements chauds\"")
                .replace("\"meetingPoint\":null", "\"meetingPoint\":\"Place du marche\"")
                .replace("{\"locale\":\"DE\",\"name\":\"Rundreise 1\",\"description\":\"Kurzbeschreibung 1\"}",
                        "{\"locale\":\"DE\",\"name\":\"Rundreise 1\",\"description\":\"Kurzbeschreibung 1\","
                                + "\"petPolicyNote\":\"Hunde verboten\","
                                + "\"mustBring\":[\"Hut\",\"\"],\"notSuitableFor\":[\"Kleinkinder\"]}");
        TourResponse created = tourService.createTour(objectMapper.readValue(body, TourRequest.class));

        // Back office read: what was typed is what comes back.
        var de = tourService.getTourById(created.getTourId()).getTranslations().stream()
                .filter(t -> t.getLocale().name().equals("DE")).findFirst().orElseThrow();
        assertThat(de.getPetPolicyNote()).isEqualTo("Hunde verboten");
        assertThat(de.getMustBring()).containsExactly("Hut", "");

        // Public read: German where translated, French where the translation has nothing.
        // Read inside the transaction: untranslated lists are the entity's own lazy collections.
        tx.executeWithoutResult(t -> {
            Tour tour = tourRepository.findById(created.getTourId()).orElseThrow();
            var german = publicTourMapper.toResponse(tour, "de", 0);
            assertThat(german.getPetPolicyNote()).isEqualTo("Hunde verboten");
            assertThat(german.getNotSuitableFor()).containsExactly("Kleinkinder");
            assertThat(german.getGoodToKnow()).as("no German text: falls back to French").isEqualTo("Prevoir des vetements chauds");
            assertThat(german.getMustBring()).containsExactly("Hut", "");
            // No English translation at all: everything is the French original.
            var english = publicTourMapper.toResponse(tour, "en", 0);
            assertThat(english.getMustBring()).containsExactly("Chapeau", "Creme solaire");
            // The meeting point is a place name: never translated, same in every language.
            assertThat(german.getMeetingPoint()).isEqualTo("Place du marche");
            assertThat(english.getMeetingPoint()).isEqualTo("Place du marche");
        });
    }
}
