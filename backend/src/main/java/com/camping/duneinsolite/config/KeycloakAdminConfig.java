package com.camping.duneinsolite.config;


import org.jboss.resteasy.client.jaxrs.ResteasyClientBuilder;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class KeycloakAdminConfig {

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.admin.realm}")
    private String realm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;

    /**
     * Keycloak admin client bean — used to create/update/delete users
     * in Keycloak programmatically (sync with your local DB)
     *
     * connectionTTL caps how long a pooled connection can be reused before
     * it's discarded and replaced - without it, a connection opened before
     * Keycloak itself restarts (a container restart, a brief network blip,
     * this session's own Docker Desktop restart) stays in the pool, looking
     * healthy, until the next request tries to write to it and gets a raw
     * "connection reset"/broken-pipe exception. That surfaced live: the
     * first guest-checkout booking after this backend had been running
     * across a Docker restart failed with a bare 500 (Keycloak user
     * creation), while an identical request against a freshly-started
     * backend succeeded immediately - not a code defect in the booking
     * flow itself, but every subsequent request on this client would have
     * kept failing the same way until the process was restarted by hand.
     * A short, finite TTL means the pool self-heals within one connection's
     * lifetime instead of needing a manual restart to notice the backing
     * service came back.
     */
    @Bean
    public Keycloak keycloakAdminClient() {
        var resteasyClient = ((ResteasyClientBuilder) ResteasyClientBuilder.newBuilder())
                .connectionTTL(60, TimeUnit.SECONDS)
                .connectionCheckoutTimeout(10, TimeUnit.SECONDS)
                .build();

        return KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm(realm)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .grantType("client_credentials")
                .resteasyClient(resteasyClient)
                .build();
    }
}
