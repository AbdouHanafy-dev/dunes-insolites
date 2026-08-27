package com.camping.duneinsolite.controller;

import com.camping.duneinsolite.dto.request.RegisterRequest;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.service.AuthService;
import com.camping.duneinsolite.service.KeycloakUserSyncService;
import com.camping.duneinsolite.service.UserService;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression test for the role-escalation bug CLAUDE.md documents: a
 * caller-supplied role on the permitAll() /api/auth/register endpoint used to
 * let anyone on the internet grant themselves a Keycloak realm admin
 * account. RegisterRequest has no role field precisely so this can't happen
 * any more - this test proves it by POSTing raw JSON that tries every way an
 * attacker might smuggle a role/type in, and confirming the server always
 * registers UserRole.CLIENT regardless.
 *
 * Deliberately not a @SpringBootTest/@WebMvcTest: this environment has no
 * reachable Postgres/Keycloak, and the property under test - unknown JSON
 * fields are dropped, and the controller hardcodes the role - doesn't need a
 * Spring context to verify. Real JSON deserialization (via ObjectMapper) is
 * still exercised, so this isn't just testing the Java object model.
 */
class AuthControllerRegisterSecurityTest {

    // Matches Spring Boot's autoconfigured ObjectMapper bean, which disables
    // this - a vanilla `new ObjectMapper()` throws on unknown fields, which
    // would make this test pass for the wrong reason (rejecting the request
    // outright) rather than proving the role field is silently dropped.
    private final ObjectMapper objectMapper = new ObjectMapper()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

    @ParameterizedTest
    @ValueSource(strings = {
            // Every field name a client might guess grants a privileged role.
            "{\"name\":\"Eve\",\"email\":\"eve@test.com\",\"password\":\"pw\",\"role\":\"ADMIN\"}",
            "{\"name\":\"Eve\",\"email\":\"eve@test.com\",\"password\":\"pw\",\"role\":\"CAMPING\"}",
            "{\"name\":\"Eve\",\"email\":\"eve@test.com\",\"password\":\"pw\",\"role\":\"PARTENAIRE\"}",
            "{\"name\":\"Eve\",\"email\":\"eve@test.com\",\"password\":\"pw\",\"userRole\":\"ADMIN\"}",
            "{\"name\":\"Eve\",\"email\":\"eve@test.com\",\"password\":\"pw\",\"type\":\"ADMIN\"}",
            "{\"name\":\"Eve\",\"email\":\"eve@test.com\",\"password\":\"pw\",\"isAdmin\":true}",
            "{\"name\":\"Eve\",\"email\":\"eve@test.com\",\"password\":\"pw\",\"admin\":true}",
            // And the honest, role-free payload - the only shape RegisterRequest documents.
            "{\"name\":\"Eve\",\"email\":\"eve@test.com\",\"password\":\"pw\"}",
    })
    void registerAlwaysCreatesClientRegardlessOfSuppliedRole(String rawJson) throws Exception {
        RegisterRequest request = objectMapper.readValue(rawJson, RegisterRequest.class);

        KeycloakUserSyncService keycloakUserSyncService = mock(KeycloakUserSyncService.class);
        AuthService authService = mock(AuthService.class);
        UserService userService = mock(UserService.class);

        User created = User.builder().userId(UUID.randomUUID()).name("Eve").email("eve@test.com")
                .role(UserRole.CLIENT).build();
        when(keycloakUserSyncService.registerUser(any(RegisterRequest.class), eq(UserRole.CLIENT)))
                .thenReturn(created);

        AuthController controller = new AuthController(keycloakUserSyncService, authService, userService);
        ResponseEntity<User> response = controller.register(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getRole()).isEqualTo(UserRole.CLIENT);
        // The real assertion: no matter what the raw JSON tried to smuggle in,
        // the controller only ever asks Keycloak/the DB to create a CLIENT.
        verify(keycloakUserSyncService).registerUser(any(RegisterRequest.class), eq(UserRole.CLIENT));
    }
}
