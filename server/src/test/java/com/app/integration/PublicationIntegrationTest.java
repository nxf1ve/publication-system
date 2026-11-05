package com.app.integration;

import com.app.repositories.PublicationRepository;
import com.app.repositories.UserRepository;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.annotation.DirtiesContext;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Full HTTP -> Security -> controller -> JPA -> real PostgreSQL, in a disposable test database. */
@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:postgresql://[^/]+/publication_system_test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=${TEST_DB_URL}", "spring.datasource.username=${TEST_DB_USERNAME:postgres}",
    "spring.datasource.password=${TEST_DB_PASSWORD:postgres}", "spring.jpa.hibernate.ddl-auto=create-drop",
    "app.admin.username=", "app.admin.password="
})
@DirtiesContext
class PublicationIntegrationTest {
    @Autowired private TestRestTemplate http;
    @Autowired private PublicationRepository publications;
    @Autowired private UserRepository users;

    private ResponseEntity<Map> call(HttpMethod method, String path, Object body, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) headers.setBearerAuth(token);
        return http.exchange("/api" + path, method, new HttpEntity<>(body, headers), Map.class);
    }

    private String register(String username) {
        var response = call(HttpMethod.POST, "/auth/register", Map.of("username", username, "password", "password123"), null);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        return (String) response.getBody().get("accessToken");
    }

    @Test
    void registrationLoginCrudPersistenceAndOwnershipThroughRealHttp() {
        String name = "integration_" + UUID.randomUUID().toString().substring(0, 8);
        String owner = register(name);
        String other = register(name + "_other");
        var storedAccount = users.findByUsername(name).orElseThrow();
        assertFalse(storedAccount.getPassword().equals("password123"));
        assertEquals("USER", storedAccount.getRole());
        assertEquals(HttpStatus.CONFLICT, call(HttpMethod.POST, "/auth/register",
                Map.of("username", name, "password", "password123"), null).getStatusCode());
        var login = call(HttpMethod.POST, "/auth/login", Map.of("username", name, "password", "password123"), null);
        assertEquals(HttpStatus.OK, login.getStatusCode());
        owner = (String) login.getBody().get("accessToken");
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.GET, "/auth/me", null, "invalid").getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.GET, "/publications/1", null, null).getStatusCode());

        Map<String, Object> body = new java.util.HashMap<>(Map.of("title", "Persistent publication", "authors", "Author",
                "year", 2026, "type", "Статья", "department", "Информационные системы", "owner", "Employee"));
        var created = call(HttpMethod.POST, "/publications", body, owner);
        assertEquals(HttpStatus.CREATED, created.getStatusCode());
        long id = ((Number) created.getBody().get("id")).longValue();
        String path = "/publications/" + id;
        assertEquals("Persistent publication", publications.findById(id).orElseThrow().getTitle());
        assertEquals(HttpStatus.OK, call(HttpMethod.GET, path, null, other).getStatusCode());
        body.put("title", "Changed publication");
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.PUT, path, body, other).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.DELETE, path, null, other).getStatusCode());
        assertEquals("Persistent publication", publications.findById(id).orElseThrow().getTitle());
        body.put("year", 1800);
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.PUT, path, body, owner).getStatusCode());
        body.put("year", 2026);
        assertEquals(HttpStatus.OK, call(HttpMethod.PUT, path, body, owner).getStatusCode());
        assertEquals("Changed publication", publications.findById(id).orElseThrow().getTitle());
        assertTrue(call(HttpMethod.GET, path, null, owner).getBody().get("title").equals("Changed publication"));
        assertEquals(HttpStatus.NO_CONTENT, call(HttpMethod.DELETE, path, null, owner).getStatusCode());
        assertFalse(publications.existsById(id));
        assertEquals(HttpStatus.NOT_FOUND, call(HttpMethod.GET, path, null, owner).getStatusCode());
    }
}
