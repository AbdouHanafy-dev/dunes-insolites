package com.camping.duneinsolite.service;

import com.camping.duneinsolite.dto.request.RegisterRequest;
import com.camping.duneinsolite.exception.TermsNotAcceptedException;
import com.camping.duneinsolite.model.User;
import com.camping.duneinsolite.model.enums.UserRole;
import com.camping.duneinsolite.repository.*;
import com.camping.duneinsolite.service.impl.EmailService;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.*;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Phase 5 — consent / terms hardening.
 *
 * {@code termsAcceptedAt} must be server-controlled: set to the server clock at
 * registration, never a value the client can choose, and never rewritten by a
 * later update. These tests pin that.
 */
class KeycloakUserSyncServiceConsentTest {

    private UserRepository userRepository;
    private Keycloak keycloak;
    private RealmResource realmResource;
    private UsersResource usersResource;
    private KeycloakUserSyncService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        keycloak = mock(Keycloak.class);
        realmResource = mock(RealmResource.class);
        usersResource = mock(UsersResource.class);
        when(keycloak.realm(any())).thenReturn(realmResource);
        when(realmResource.users()).thenReturn(usersResource);

        service = new KeycloakUserSyncService(
                keycloak, userRepository, mock(EmailService.class),
                mock(UserProductRemiseRepository.class), mock(TourTypeRepository.class),
                mock(TourRepository.class), mock(ExtraRepository.class),
                mock(EntityManager.class), mock(AccountActionTokenRepository.class),
                mock(NotificationRepository.class));
        ReflectionTestUtils.setField(service, "realm", "duneinsolite");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void stubKeycloakCreate(String id) {
        Response resp = mock(Response.class);
        when(resp.getStatus()).thenReturn(201);
        when(resp.getHeaderString("Location")).thenReturn("http://kc/realms/duneinsolite/users/" + id);
        when(usersResource.create(any(UserRepresentation.class))).thenReturn(resp);
        RolesResource roles = mock(RolesResource.class);
        when(realmResource.roles()).thenReturn(roles);
        when(roles.list()).thenReturn(List.of());
        RoleResource roleResource = mock(RoleResource.class);
        when(roles.get(any())).thenReturn(roleResource);
        RoleRepresentation rep = new RoleRepresentation();
        rep.setName("CLIENT");
        when(roleResource.toRepresentation()).thenReturn(rep);
        UserResource userResource = mock(UserResource.class);
        when(usersResource.get(id)).thenReturn(userResource);
        RoleMappingResource rm = mock(RoleMappingResource.class);
        when(userResource.roles()).thenReturn(rm);
        when(rm.realmLevel()).thenReturn(mock(RoleScopeResource.class));
    }

    private RegisterRequest req(boolean acceptedTerms) {
        RegisterRequest r = new RegisterRequest();
        r.setName("Jane");
        r.setEmail("jane@example.com");
        r.setPassword("password123");
        r.setPhone("+21650000000");
        r.setAcceptedTerms(acceptedTerms);
        return r;
    }

    @Test
    void clientRegistration_recordsConsentAtTheServerClock_notFromTheRequest() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        stubKeycloakCreate("11111111-1111-1111-1111-111111111111");

        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        User saved = service.registerUser(req(true), UserRole.CLIENT);
        LocalDateTime after = LocalDateTime.now().plusSeconds(1);

        assertThat(saved.getTermsAcceptedAt())
                .as("server-set, roughly now")
                .isAfter(before).isBefore(after);
    }

    @Test
    void clientRegistrationWithoutAcceptance_isRejectedBeforeAnyKeycloakOrDbWrite() {
        assertThatThrownBy(() -> service.registerUser(req(false), UserRole.CLIENT))
                .isInstanceOf(TermsNotAcceptedException.class);

        verifyNoInteractions(keycloak);
        verify(userRepository, never()).save(any());
    }

    @Test
    void nonClientRegistration_isExemptAndStoresNoConsentTimestamp() {
        // The seeder registers ADMIN/CAMPING accounts — trusted server-side
        // code that never saw a consent checkbox.
        when(userRepository.existsByEmail(any())).thenReturn(false);
        stubKeycloakCreate("22222222-2222-2222-2222-222222222222");

        User saved = service.registerUser(req(false), UserRole.ADMIN);

        assertThat(saved.getTermsAcceptedAt()).isNull();
    }

    @Test
    void registerRequest_cannotCarryAClientChosenAcceptanceDate() throws Exception {
        ObjectMapper mapper = new ObjectMapper()
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        RegisterRequest parsed = mapper.readValue(
                "{\"name\":\"J\",\"email\":\"j@x.com\",\"password\":\"password123\"," +
                "\"acceptedTerms\":true,\"termsAcceptedAt\":\"2000-01-01T00:00:00\"}",
                RegisterRequest.class);

        // No property exists to receive it; only the boolean is honoured.
        assertThat(parsed.isAcceptedTerms()).isTrue();
        assertThat(RegisterRequest.class.getDeclaredFields())
                .noneMatch(f -> f.getName().toLowerCase().contains("acceptedat")
                        || f.getName().toLowerCase().contains("termsaccepted") && f.getType() != boolean.class);
    }

    @Test
    void adminUpdateDto_hasNoFieldThatCanRewriteConsent() {
        assertThat(com.camping.duneinsolite.dto.request.UserRequest.class.getDeclaredFields())
                .noneMatch(f -> f.getName().toLowerCase().contains("terms")
                        || f.getName().toLowerCase().contains("consent"));
    }
}
