package com.camping.duneinsolite.service;



import com.camping.duneinsolite.dto.request.LoginRequest;
import com.camping.duneinsolite.dto.response.LoginResponse;
import com.camping.duneinsolite.exception.AuthenticationFailedException;
import com.camping.duneinsolite.exception.ExternalServiceException;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import java.text.ParseException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor

public class AuthService {

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.realm}")
    private String realm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;

    private final RestTemplate restTemplate;


    public LoginResponse login(LoginRequest request) {
        String tokenUrl = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("username", request.getEmail());
        body.add("password", request.getPassword());
        body.add("scope", "openid");

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> tokenData = response.getBody();
                String accessToken = (String) tokenData.get("access_token");

                // Decode JWT to extract user claims
                SignedJWT signedJWT = SignedJWT.parse(accessToken);
                JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

                String userId = claims.getSubject();                          // "sub" → Keycloak user ID
                String email  = claims.getStringClaim("email");
                String name   = claims.getStringClaim("name");               // full name
                // or use "preferred_username" if you prefer the username
                // String username = claims.getStringClaim("preferred_username");

                return new LoginResponse(
                        accessToken,
                        (String) tokenData.get("refresh_token"),
                        ((Number) tokenData.get("expires_in")).longValue(),
                        (String) tokenData.get("token_type"),
                        userId,
                        email,
                        name
                );
            }

            throw new ExternalServiceException("Authentication", null);

        } catch (HttpClientErrorException e) {
            // Keycloak answered and rejected the credentials - a real 401.
            log.warn("Login rejected for {}: {}", request.getEmail(), e.getStatusCode());
            throw new AuthenticationFailedException();

        } catch (RestClientException e) {
            // Keycloak could not be reached, or failed. This is NOT a bad
            // password: telling the user their credentials are wrong during an
            // outage sends them to reset a password that was never the problem.
            log.error("Keycloak unreachable during login for {}: {}",
                    request.getEmail(), e.getMessage());
            throw new ExternalServiceException("Authentication", e);

        } catch (ParseException e) {
            // The token came back but could not be decoded - that is our defect,
            // not the caller's. Let it surface as a 500 with a generic message.
            log.error("Could not parse the access token returned for {}", request.getEmail(), e);
            throw new IllegalStateException("Malformed access token from the identity provider", e);
        }
    }

    /**
     * Exchanges a Keycloak refresh token for a new access token + refresh token,
     * used by the frontend when an access token has expired mid-session.
     */
    public LoginResponse refresh(String refreshToken) {
        String tokenUrl = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "refresh_token");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("refresh_token", refreshToken);

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> tokenData = response.getBody();
                String accessToken = (String) tokenData.get("access_token");

                SignedJWT signedJWT = SignedJWT.parse(accessToken);
                JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

                String userId = claims.getSubject();
                String email  = claims.getStringClaim("email");
                String name   = claims.getStringClaim("name");

                return new LoginResponse(
                        accessToken,
                        (String) tokenData.get("refresh_token"),
                        ((Number) tokenData.get("expires_in")).longValue(),
                        (String) tokenData.get("token_type"),
                        userId,
                        email,
                        name
                );
            }

            throw new RuntimeException("Refresh failed: empty response from Keycloak");

        } catch (Exception e) {
            log.error("Token refresh failed: {}", e.getMessage());
            throw new RuntimeException("Invalid or expired refresh token");
        }
    }
}
