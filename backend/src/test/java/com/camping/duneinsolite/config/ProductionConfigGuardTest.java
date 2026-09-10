package com.camping.duneinsolite.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.Map;
import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.*;

/**
 * Phase 5 — the fail-closed production config gate. Pure logic: env lookups are
 * injected, so no real environment variables are touched.
 */
class ProductionConfigGuardTest {

    private static UnaryOperator<String> env(Map<String, String> m) {
        return m::get;
    }

    private static final Map<String, String> COMPLETE_PROD = Map.of(
            "DEPLOY_ENV", "production",
            "SPRING_DATASOURCE_URL", "jdbc:postgresql://db.internal:5432/duneinsolite",
            "SPRING_DATASOURCE_PASSWORD", "x",
            "SPRING_RABBITMQ_HOST", "mq.internal",
            "SPRING_RABBITMQ_PASSWORD", "x",
            "KEYCLOAK_SERVER_URL", "https://id.dunes-insolites.com",
            "KEYCLOAK_CLIENT_SECRET", "x",
            "APP_FRONTEND_URL", "https://www.dunes-insolites.com",
            "SPRING_MAIL_PASSWORD", "x");

    private ProductionConfigGuard guard(Map<String, String> vars, MockEnvironment springEnv) {
        return new ProductionConfigGuard(springEnv, env(vars));
    }

    @Test
    void doesNothingOutsideProduction() {
        var g = guard(Map.of(), new MockEnvironment());
        assertThatCode(g::afterPropertiesSet).doesNotThrowAnyException();
    }

    @Test
    void productionWithEveryRequiredValue_passes() {
        MockEnvironment springEnv = new MockEnvironment()
                .withProperty("spring.jpa.hibernate.ddl-auto", "validate");
        assertThatCode(guard(COMPLETE_PROD, springEnv)::afterPropertiesSet).doesNotThrowAnyException();
    }

    @Test
    void productionMissingADatabaseUrl_failsClosed() {
        var vars = new java.util.HashMap<>(COMPLETE_PROD);
        vars.remove("SPRING_DATASOURCE_URL");
        assertThatThrownBy(guard(vars, new MockEnvironment())::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("1 problem");
    }

    @Test
    void productionMissingSeveralSecrets_reportsAllOfThem() {
        var vars = new java.util.HashMap<>(COMPLETE_PROD);
        vars.remove("SPRING_DATASOURCE_PASSWORD");
        vars.remove("KEYCLOAK_CLIENT_SECRET");
        vars.remove("SPRING_RABBITMQ_PASSWORD");
        assertThatThrownBy(guard(vars, new MockEnvironment())::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("3 problem");
    }

    @Test
    void productionPointingAtTheLeakedHost_failsClosed() {
        MockEnvironment springEnv = new MockEnvironment()
                .withProperty("spring.datasource.url", "jdbc:postgresql://79.143.185.33:5433/duneinsolite");
        assertThatThrownBy(guard(COMPLETE_PROD, springEnv)::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("79.143.185.33");
    }

    @Test
    void productionWithDdlAutoUpdate_failsClosed() {
        MockEnvironment springEnv = new MockEnvironment()
                .withProperty("spring.jpa.hibernate.ddl-auto", "update");
        assertThatThrownBy(guard(COMPLETE_PROD, springEnv)::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ddl-auto");
    }

    @Test
    void mailPasswordOnlyRequiredWhenMailHealthEnabled() {
        var vars = new java.util.HashMap<>(COMPLETE_PROD);
        vars.remove("SPRING_MAIL_PASSWORD");
        MockEnvironment mailOff = new MockEnvironment()
                .withProperty("management.health.mail.enabled", "false");
        assertThatCode(guard(vars, mailOff)::afterPropertiesSet).doesNotThrowAnyException();

        MockEnvironment mailOn = new MockEnvironment();
        assertThatThrownBy(guard(vars, mailOn)::afterPropertiesSet)
                .hasMessageContaining("1 problem");
    }

    @Test
    void prodProfileAlsoCountsAsProduction() {
        MockEnvironment springEnv = new MockEnvironment();
        springEnv.setActiveProfiles("prod");
        var vars = new java.util.HashMap<>(COMPLETE_PROD);
        vars.remove("DEPLOY_ENV");
        vars.remove("KEYCLOAK_CLIENT_SECRET");
        assertThatThrownBy(guard(vars, springEnv)::afterPropertiesSet)
                .isInstanceOf(IllegalStateException.class);
    }
}
