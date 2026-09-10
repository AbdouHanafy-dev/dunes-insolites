package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.GalleryImageRequest;
import com.camping.duneinsolite.dto.response.GalleryImageResponse;
import com.camping.duneinsolite.dto.response.publicapi.PublicGalleryItemResponse;
import com.camping.duneinsolite.repository.GalleryImageRepository;
import com.camping.duneinsolite.service.GalleryService;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The vitrine photo gallery is real backoffice content (V8):
 *   • GET /api/public/gallery is unauthenticated, ordered by position, and
 *     maps the entity's imageUrl onto the GalleryItem `src` wire field
 *   • the management endpoints under /api/gallery are NOT public
 *   • create / update / delete round-trip through the service
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.health.mail.enabled=false"
})
@Testcontainers
class GalleryIT {

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

    @Autowired GalleryService galleryService;
    @Autowired GalleryImageRepository galleryImageRepository;

    @LocalServerPort int port;
    private final HttpClient http = HttpClient.newHttpClient();

    @AfterEach
    void cleanup() {
        galleryImageRepository.deleteAll();
    }

    private GalleryImageRequest req(String url, String alt, String tag, Integer position, Boolean tall) {
        GalleryImageRequest r = new GalleryImageRequest();
        r.setImageUrl(url);
        r.setAlt(alt);
        r.setTag(tag);
        r.setPosition(position);
        r.setTall(tall);
        return r;
    }

    @Test
    void publicGallery_isUnauthenticated_orderedByPosition_andMapsImageUrlToSrc() throws Exception {
        // Seed data already populated 5 rows on startup — start from a clean slate.
        galleryImageRepository.deleteAll();
        galleryService.create(req("/media/c.jpg", "third", "All", 2, false));
        galleryService.create(req("/media/a.jpg", "first", "Camel Trek", 0, true));
        galleryService.create(req("/media/b.jpg", "second", "The Gate", 1, false));

        HttpResponse<String> res = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/public/gallery")).GET().build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(res.body()).contains("\"src\":\"/media/a.jpg\"");
        // position order: a (0), b (1), c (2)
        assertThat(res.body().indexOf("/media/a.jpg"))
                .isLessThan(res.body().indexOf("/media/b.jpg"));
        assertThat(res.body().indexOf("/media/b.jpg"))
                .isLessThan(res.body().indexOf("/media/c.jpg"));

        List<PublicGalleryItemResponse> feed = galleryService.getPublicGallery();
        assertThat(feed).extracting(PublicGalleryItemResponse::getSrc)
                .containsExactly("/media/a.jpg", "/media/b.jpg", "/media/c.jpg");
        assertThat(feed.get(0).isTall()).isTrue();
    }

    @Test
    void managementEndpoints_areNotPublic() throws Exception {
        HttpResponse<String> post = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/gallery"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(
                                "{\"imageUrl\":\"/x.jpg\",\"alt\":\"x\",\"tag\":\"All\"}"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(post.statusCode()).isIn(401, 403);

        HttpResponse<String> list = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/gallery")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(list.statusCode()).isIn(401, 403);
    }

    @Test
    void create_defaultsTallToFalse_whenOmitted_and_update_delete_roundTrip() {
        GalleryImageResponse created = galleryService.create(req("/media/x.jpg", "x", "All", null, null));
        assertThat(created.isTall()).isFalse();
        assertThat(created.getPosition()).isZero();

        GalleryImageResponse updated = galleryService.update(
                created.getGalleryItemId(), req("/media/x.jpg", "x renamed", "Dunes", 3, true));
        assertThat(updated.getAlt()).isEqualTo("x renamed");
        assertThat(updated.isTall()).isTrue();
        assertThat(updated.getPosition()).isEqualTo(3);

        UUID id = created.getGalleryItemId();
        galleryService.delete(id);
        assertThatThrownBy(() -> galleryService.getById(id))
                .isInstanceOf(com.camping.duneinsolite.exception.ResourceNotFoundException.class);
    }
}
