package com.camping.duneinsolite.audit;

import com.camping.duneinsolite.model.AuditLogEntry;
import com.camping.duneinsolite.service.AuditLogService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuditLogFilterTest {

    private static final String ID = "e4650de2-cd5b-4785-90f4-c885f0a1a9dc";

    private final AuditLogService service = mock(AuditLogService.class);
    private final AuditEntityLabels labels = mock(AuditEntityLabels.class);
    private final AuditLogFilter filter = new AuditLogFilter(service, labels);

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void signInAs(String sub, String email, String name, String... roles) {
        Jwt jwt = Jwt.withTokenValue("t").header("alg", "none").subject(sub)
                .claim("email", email).claim("name", name)
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt,
                java.util.Arrays.stream(roles).map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList()));
    }

    private MockHttpServletResponse run(MockHttpServletRequest request, int status) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (req, res) -> ((MockHttpServletResponse) res).setStatus(status);
        filter.doFilter(request, response, chain);
        return response;
    }

    @Test
    void aDelete_recordsWhoDeletedWhatEvenAfterTheRecordIsGone() throws Exception {
        signInAs("user-1", "support@dunes.test", "Support Agent", "ADMIN");
        when(labels.labelFor("tours", ID)).thenReturn(Optional.of("Tunisie : 2 jours"));
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/api/tours/" + ID);
        request.addHeader("X-Real-IP", "102.152.214.154");
        request.addHeader("User-Agent", "Mozilla/5.0 (Linux; Android 10)");

        run(request, 204);

        ArgumentCaptor<AuditLogEntry> saved = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(service).record(saved.capture());
        AuditLogEntry e = saved.getValue();
        assertThat(e.getActorId()).isEqualTo("user-1");
        assertThat(e.getActorEmail()).isEqualTo("support@dunes.test");
        assertThat(e.getActorName()).isEqualTo("Support Agent");
        assertThat(e.getActorRoles()).isEqualTo("ADMIN");
        assertThat(e.getAction()).isEqualTo("DELETE");
        assertThat(e.getEntityType()).isEqualTo("tours");
        assertThat(e.getEntityId()).isEqualTo(ID);
        assertThat(e.getEntityLabel()).isEqualTo("Tunisie : 2 jours");
        assertThat(e.getStatusCode()).isEqualTo(204);
        assertThat(e.getIp()).isEqualTo("102.152.214.154");
        assertThat(e.getUserAgent()).contains("Android");
    }

    @Test
    void aCreate_hasNoLabelLookup() throws Exception {
        signInAs("user-1", "a@b.test", "A", "CAMPING");
        run(new MockHttpServletRequest("POST", "/api/tours"), 201);

        verifyNoInteractions(labels);
        ArgumentCaptor<AuditLogEntry> saved = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(service).record(saved.capture());
        assertThat(saved.getValue().getAction()).isEqualTo("CREATE");
        assertThat(saved.getValue().getStatusCode()).isEqualTo(201);
    }

    @Test
    void aRefusedWriteIsLoggedWithItsStatus() throws Exception {
        signInAs("user-2", "c@d.test", "C", "CLIENT");
        run(new MockHttpServletRequest("DELETE", "/api/tours/" + ID), 403);

        ArgumentCaptor<AuditLogEntry> saved = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(service).record(saved.capture());
        assertThat(saved.getValue().getStatusCode()).isEqualTo(403);
    }

    @Test
    void anAnonymousCallerIsNotLogged() throws Exception {
        run(new MockHttpServletRequest("POST", "/api/tours"), 401);
        verifyNoInteractions(service);
    }

    @Test
    void readsAreNotLogged() throws Exception {
        signInAs("user-1", "a@b.test", "A", "ADMIN");
        MockHttpServletRequest get = new MockHttpServletRequest("GET", "/api/tours");
        // the servlet container asks shouldNotFilter first; doFilter on a MockRequest goes through it
        run(get, 200);
        verifyNoInteractions(service);
    }

    @Test
    void aFailureWritingTheLogDoesNotFailTheRequest() throws Exception {
        signInAs("user-1", "a@b.test", "A", "ADMIN");
        doThrow(new IllegalStateException("db down")).when(service).record(any());

        MockHttpServletResponse response = run(new MockHttpServletRequest("DELETE", "/api/tours/" + ID), 204);

        assertThat(response.getStatus()).isEqualTo(204);
    }

    @Test
    void theRealClientIpIsTheProxysHeader_notTheSocket() throws Exception {
        signInAs("user-1", "a@b.test", "A", "ADMIN");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/tours");
        request.setRemoteAddr("172.19.0.5");
        request.addHeader("X-Real-IP", "197.10.68.44");
        run(request, 201);

        ArgumentCaptor<AuditLogEntry> saved = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(service).record(saved.capture());
        assertThat(saved.getValue().getIp()).isEqualTo("197.10.68.44");
    }
}
