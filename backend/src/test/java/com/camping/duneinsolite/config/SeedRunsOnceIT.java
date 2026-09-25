package com.camping.duneinsolite.config;

import com.camping.duneinsolite.repository.GalleryImageRepository;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Sample and catalogue data is created once (V51 seed_markers). Before, every
 * start re-created whatever the editors had deleted in the backoffice, so removed
 * gallery photos and circuits came back after each deploy.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false"
})
@Testcontainers
class SeedRunsOnceIT {

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

    @Autowired Seed seed;
    @Autowired GalleryImageRepository galleryImageRepository;
    @Autowired JdbcTemplate jdbc;

    @Test
    void aFreshDatabaseIsSeededOnce_andAnEditorsDeletionSurvivesTheNextStart() throws Exception {
        // First start (this context) seeded the sample gallery on a fresh database.
        assertThat(galleryImageRepository.count()).isPositive();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM seed_markers WHERE marker_key = 'catalog-gallery'", Integer.class)).isEqualTo(1);

        // An editor deletes every photo, then the application restarts (Seed.run).
        galleryImageRepository.deleteAll();
        seed.run();

        assertThat(galleryImageRepository.count()).isZero();
    }
}
