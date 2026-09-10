package com.camping.duneinsolite.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.function.UnaryOperator;

/**
 * Fail-closed production configuration gate — the backend mirror of the
 * frontend's DI-031 build guard.
 *
 * <p>When a production signal is present ({@code DEPLOY_ENV=production} or a
 * Spring profile containing {@code prod}) this refuses to finish starting the
 * context unless every critical secret / endpoint is <b>explicitly provided</b>
 * rather than falling through to a checked-in default, and it rejects the known
 * leaked / placeholder host {@code 79.143.185.33} in any critical URL.
 *
 * <p>Implemented as an {@link InitializingBean}: {@code afterPropertiesSet()}
 * throwing aborts context startup, so a misconfigured deploy never binds a port
 * or reports ready. Does nothing outside production — local dev and tests are
 * unaffected.
 */
@Component
public class ProductionConfigGuard implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(ProductionConfigGuard.class);

    /** The IP the pre-monorepo `.env` leak exposed and that several defaults still point at. */
    static final String FORBIDDEN_PROD_HOST = "79.143.185.33";

    private static final String[][] REQUIRED = {
            {"SPRING_DATASOURCE_URL", "database endpoint"},
            {"SPRING_DATASOURCE_PASSWORD", "database credential"},
            {"SPRING_RABBITMQ_HOST", "message broker endpoint"},
            {"SPRING_RABBITMQ_PASSWORD", "message broker credential"},
            {"KEYCLOAK_SERVER_URL", "identity provider endpoint"},
            {"KEYCLOAK_CLIENT_SECRET", "identity provider credential"},
            {"APP_FRONTEND_URL", "links embedded in outgoing email"},
    };

    private static final String[] URL_KEYS = {
            "spring.datasource.url", "spring.rabbitmq.host",
            "keycloak.admin.server-url", "app.frontend.url", "site.url",
    };

    private final Environment env;
    private final UnaryOperator<String> getenv;

    @org.springframework.beans.factory.annotation.Autowired
    public ProductionConfigGuard(Environment env) {
        this(env, System::getenv);
    }

    ProductionConfigGuard(Environment env, UnaryOperator<String> getenv) {
        this.env = env;
        this.getenv = getenv;
    }

    @Override
    public void afterPropertiesSet() {
        if (!isProduction(env, getenv)) return;

        List<String> problems = new ArrayList<>();

        for (String[] r : REQUIRED) {
            if (isBlank(getenv.apply(r[0]))) {
                problems.add(r[0] + " is not set (" + r[1] + ") — must be provided explicitly in production");
            }
        }

        boolean mailEnabled = !"false".equalsIgnoreCase(env.getProperty("management.health.mail.enabled", "true"));
        if (mailEnabled && isBlank(getenv.apply("SPRING_MAIL_PASSWORD"))) {
            problems.add("SPRING_MAIL_PASSWORD is not set — set it, or disable mail (management.health.mail.enabled=false)");
        }

        for (String key : URL_KEYS) {
            String value = env.getProperty(key);
            if (value != null && value.contains(FORBIDDEN_PROD_HOST)) {
                problems.add(key + " resolves to the leaked/placeholder host " + FORBIDDEN_PROD_HOST
                        + " — point it at the real endpoint");
            }
        }

        String ddl = env.getProperty("spring.jpa.hibernate.ddl-auto", "validate");
        if (!"validate".equals(ddl) && !"none".equals(ddl)) {
            problems.add("spring.jpa.hibernate.ddl-auto is \"" + ddl + "\" — Flyway owns the schema; must be validate/none");
        }

        if (!problems.isEmpty()) {
            String body = String.join("\n", problems.stream().map(p -> "  • " + p).toList());
            log.error("\n\n" +
                    "================================================================\n" +
                    " PRODUCTION CONFIG GUARD — refusing to start (" + problems.size() + " problem(s)):\n" +
                    "================================================================\n" +
                    body + "\n" +
                    "================================================================\n" +
                    " Unset DEPLOY_ENV (or set it to something other than 'production')\n" +
                    " to bypass this gate — development only.\n");
            throw new IllegalStateException(
                    "Production configuration is incomplete — " + problems.size() + " problem(s): "
                            + String.join("; ", problems));
        }

        log.info("ProductionConfigGuard: all {} required production settings are explicitly provided.", REQUIRED.length);
    }

    static boolean isProduction(Environment env, UnaryOperator<String> getenv) {
        if ("production".equalsIgnoreCase(getenv.apply("DEPLOY_ENV"))) return true;
        for (String p : env.getActiveProfiles()) {
            if (p.toLowerCase().contains("prod")) return true;
        }
        return false;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
