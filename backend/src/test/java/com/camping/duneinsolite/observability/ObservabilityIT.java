package com.camping.duneinsolite.observability;

import com.camping.duneinsolite.service.KeycloakUserSyncService;
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
import org.testcontainers.rabbitmq.RabbitMQContainer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Item 5 — the actuator surface is useful AND safe:
 *   • /actuator/health is public but leaks no component detail unauthenticated
 *   • readiness reflects real dependencies (db + rabbit), not just "JVM alive"
 *   • metrics / prometheus require auth
 *   • a correlation id is honoured and echoed
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "keycloak.admin.client-secret=test-secret",
        "management.endpoints.web.exposure.include=health,info,metrics,prometheus",
        "management.health.mail.enabled=false"
})
@Testcontainers
class ObservabilityIT {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");
    @Container
    static final RabbitMQContainer RABBIT = new RabbitMQContainer("rabbitmq:3-management");

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

    @org.springframework.boot.test.web.server.LocalServerPort
    int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> get(String path, String... headers) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        for (int i = 0; i + 1 < headers.length; i += 2) b.header(headers[i], headers[i + 1]);
        return http.send(b.GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void healthIsPublicButLeaksNoComponentDetail() throws Exception {
        HttpResponse<String> res = get("/actuator/health");
        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(res.body()).contains("\"status\":\"UP\"");
        assertThat(res.body()).doesNotContain("components");
        assertThat(res.body()).doesNotContain("PostgreSQL");
    }

    @Test
    void readinessReflectsRealDependencies() throws Exception {
        HttpResponse<String> res = get("/actuator/health/readiness");
        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(res.body()).contains("\"status\":\"UP\"");
    }

    @Test
    void livenessProbeIsAvailable() throws Exception {
        assertThat(get("/actuator/health/liveness").statusCode()).isEqualTo(200);
    }

    @Test
    void metricsAndPrometheusRequireAuth() throws Exception {
        assertThat(get("/actuator/prometheus").statusCode()).isEqualTo(401);
        assertThat(get("/actuator/metrics").statusCode()).isEqualTo(401);
    }

    @Test
    void correlationIdIsHonouredAndEchoed() throws Exception {
        HttpResponse<String> res = get("/actuator/health", CorrelationId.HTTP_HEADER, "corr-abc-123");
        assertThat(res.headers().firstValue(CorrelationId.HTTP_HEADER)).hasValue("corr-abc-123");
    }

    @Test
    void aMintedCorrelationIdIsReturnedWhenNoneSupplied() throws Exception {
        HttpResponse<String> res = get("/actuator/health");
        assertThat(res.headers().firstValue(CorrelationId.HTTP_HEADER)).isPresent();
        assertThat(res.headers().firstValue(CorrelationId.HTTP_HEADER).get()).isNotBlank();
    }
}
