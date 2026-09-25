package com.camping.duneinsolite.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A JSON body with a wrong type or an unknown enum value must say WHICH field,
 * so a 30-field wizard can point at the input instead of "malformed request".
 * The submitted value itself is never echoed back.
 */
class GlobalExceptionHandlerBodyPathTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    enum Kind { ACTIVITY, TRANSFER }

    record Step(String title, Kind segmentType, Integer durationMinutes) {}

    record Body(String name, List<Step> programSteps) {}

    private HttpMessageNotReadableException failing(String json) {
        try {
            JsonMapper.builder().build().readValue(json, Body.class);
            throw new AssertionError("expected the body to be rejected");
        } catch (tools.jackson.core.JacksonException e) {
            return new HttpMessageNotReadableException("unreadable", e, new MockHttpInputMessage(new byte[0]));
        }
    }

    @Test
    void wrongEnumValue_namesTheFieldPathButNotTheValue() {
        ResponseEntity<Map<String, Object>> res = handler.handleUnreadableBody(failing(
                "{\"name\":\"n\",\"programSteps\":[{\"title\":\"a\"},{\"title\":\"b\",\"segmentType\":\"SECRET_VALUE\"}]}"));

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        Map<String, Object> body = res.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("message").toString()).contains("programSteps[1].segmentType");
        @SuppressWarnings("unchecked")
        Map<String, String> errors = (Map<String, String>) body.get("errors");
        assertThat(errors).containsOnlyKeys("programSteps[1].segmentType");
        assertThat(body.toString()).doesNotContain("SECRET_VALUE").doesNotContain("com.camping");
    }

    @Test
    void wrongNumberType_namesTheField() {
        ResponseEntity<Map<String, Object>> res = handler.handleUnreadableBody(failing(
                "{\"programSteps\":[{\"durationMinutes\":\"abc\"}]}"));

        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().get("message").toString()).contains("programSteps[0].durationMinutes");
    }

    @Test
    void bodyThatIsNotJson_keepsTheGenericAnswer() {
        HttpMessageNotReadableException notJson =
                new HttpMessageNotReadableException("unreadable", new MockHttpInputMessage(new byte[0]));

        ResponseEntity<Map<String, Object>> res = handler.handleUnreadableBody(notJson);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().get("message")).isEqualTo("Malformed or unsupported request.");
        assertThat(res.getBody()).doesNotContainKey("errors");
    }
}
