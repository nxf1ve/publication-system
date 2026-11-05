package com.app.controllers;

import com.app.models.Publication;
import com.app.models.User;
import com.app.repositories.PublicationRepository;
import com.app.repositories.UserRepository;
import com.app.security.JwtAuthenticationFilter;
import com.app.security.JwtService;
import com.app.security.SecurityConfig;
import com.app.services.PublicationCatalogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real controller, validation, catalog service and JWT security; only repositories are mocked. */
@WebMvcTest(PublicationController.class)
@Import({PublicationCatalogService.class, SecurityConfig.class, JwtService.class, JwtAuthenticationFilter.class})
class PublicationControllerTest {
    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwt;
    @Autowired private ObjectMapper json;
    @MockitoBean private PublicationRepository publications;
    @MockitoBean private UserRepository users;
    private Publication existing;

    @BeforeEach
    void setup() {
        User owner = account(1L, "owner", "USER");
        when(users.findByUsername("owner")).thenReturn(Optional.of(owner));
        when(users.findByUsername("other")).thenReturn(Optional.of(account(2L, "other", "USER")));
        when(users.findByUsername("admin")).thenReturn(Optional.of(account(3L, "admin", "ADMIN")));
        existing = new Publication();
        existing.setId(10L);
        existing.setAuthor(owner);
        existing.setTitle("Existing title");
        when(publications.findById(10L)).thenReturn(Optional.of(existing));
        when(publications.save(any(Publication.class))).thenAnswer(call -> {
            Publication saved = call.getArgument(0);
            if (saved.getId() == null) saved.setId(11L);
            return saved;
        });
    }

    private static User account(Long id, String name, String role) {
        User user = new User();
        user.setId(id);
        user.setUsername(name);
        user.setRole(role);
        return user;
    }

    private String token(String username) { return "Bearer " + jwt.generate(username); }

    private static Map<String, Object> valid() {
        return new LinkedHashMap<>(Map.of("title", "Valid title", "authors", "Author", "year", 2026,
                "type", "Статья", "department", "Информационные системы", "owner", "Employee"));
    }

    @Test
    void readsListAndSinglePublicationWithoutExposingAccountSecrets() throws Exception {
        when(publications.findAll()).thenReturn(List.of(existing));
        mvc.perform(get("/api/publications").header("Authorization", token("other")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].ownerId").value(1))
                .andExpect(jsonPath("$[0].author").doesNotExist());
        mvc.perform(get("/api/publications/10").header("Authorization", token("owner")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Existing title"));
    }

    @Test
    void createsUsingAuthenticatedOwnerAndDefaultStatus() throws Exception {
        Map<String, Object> body = valid();
        body.put("title", "  Valid title  ");
        body.put("ownerId", 2);
        body.put("status", "Approved");
        mvc.perform(post("/api/publications").header("Authorization", token("owner"))
                .contentType("application/json").content(json.writeValueAsString(body)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(11))
                .andExpect(jsonPath("$.title").value("Valid title"))
                .andExpect(jsonPath("$.ownerId").value(1)).andExpect(jsonPath("$.status").value("На проверке"));
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"owner", "admin"})
    void ownerAndAdminCanUpdateAndDelete(String username) throws Exception {
        mvc.perform(put("/api/publications/10").header("Authorization", token(username))
                .contentType("application/json").content(json.writeValueAsString(valid())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ownerId").value(1));
        assertNotNull(existing.getUpdatedAt());
        mvc.perform(delete("/api/publications/10").header("Authorization", token(username)))
                .andExpect(status().isNoContent());
        verify(publications).delete(existing);
    }

    @Test
    void otherUserCannotChangeOrDeletePublication() throws Exception {
        mvc.perform(put("/api/publications/10").header("Authorization", token("other"))
                .contentType("application/json").content(json.writeValueAsString(valid())))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/publications/10").header("Authorization", token("other")))
                .andExpect(status().isForbidden());
        assertEquals("Existing title", existing.getTitle());
        verify(publications, never()).save(any());
        verify(publications, never()).delete(any(Publication.class));
    }

    @Test
    void missingPublicationReturns404ForReadUpdateAndDelete() throws Exception {
        mvc.perform(get("/api/publications/999").header("Authorization", token("owner"))).andExpect(status().isNotFound());
        mvc.perform(put("/api/publications/999").header("Authorization", token("owner"))
                .contentType("application/json").content(json.writeValueAsString(valid()))).andExpect(status().isNotFound());
        mvc.perform(delete("/api/publications/999").header("Authorization", token("owner"))).andExpect(status().isNotFound());
    }

    @Test
    void anonymousRequestsCannotReadOrWrite() throws Exception {
        mvc.perform(get("/api/publications")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/publications").contentType("application/json").content(json.writeValueAsString(valid())))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/publications/10").contentType("application/json").content(json.writeValueAsString(valid())))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/publications/10")).andExpect(status().isUnauthorized());
    }

    static Stream<Arguments> invalidFields() {
        return Stream.of(Arguments.of("title", ""), Arguments.of("title", "ab"), Arguments.of("title", " a "), Arguments.of("title", "a".repeat(201)),
                Arguments.of("authors", " "), Arguments.of("authors", "a".repeat(2001)), Arguments.of("year", 1899),
                Arguments.of("year", Year.now().getValue() + 2), Arguments.of("year", null), Arguments.of("type", "Other"),
                Arguments.of("department", "Other"), Arguments.of("owner", " "), Arguments.of("owner", "a".repeat(201)));
    }

    @ParameterizedTest
    @MethodSource("invalidFields")
    void rejectsInvalidCreateAndUpdateWithoutPersistence(String field, Object value) throws Exception {
        Map<String, Object> body = valid();
        body.put(field, value);
        String content = json.writeValueAsString(body);
        mvc.perform(post("/api/publications").header("Authorization", token("owner"))
                .contentType("application/json").content(content)).andExpect(status().isBadRequest());
        mvc.perform(put("/api/publications/10").header("Authorization", token("owner"))
                .contentType("application/json").content(content)).andExpect(status().isBadRequest());
        verify(publications, never()).save(any());
    }
}
