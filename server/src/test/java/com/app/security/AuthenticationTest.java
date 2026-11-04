package com.app.security;

import com.app.controllers.AuthController;
import com.app.models.User;
import com.app.repositories.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtService.class, JwtAuthenticationFilter.class})
class AuthenticationTest {
    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwt;
    @Autowired private PasswordEncoder passwords;
    @MockitoBean private UserRepository users;
    private User user;

    @BeforeEach
    void setup() {
        user = new User();
        user.setId(1L);
        user.setUsername("employee");
        user.setPassword(passwords.encode("password123"));
        when(users.findByUsername("employee")).thenReturn(Optional.of(user));
    }

    @Test
    void loginAndRestoreSession() throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"username\":\"employee\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.user.role").value("USER")).andExpect(jsonPath("$.user.password").doesNotExist());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwt.generate("employee")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("employee"));
    }

    @Test
    void rejectsInvalidCredentialsAndTokens() throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"username\":\"employee\",\"password\":\"incorrect\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + jwt.generate("employee")))
                .andExpect(status().isForbidden());
    }

    @Test
    void registersWithHashAndUserRoleOnly() throws Exception {
        when(users.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            org.junit.jupiter.api.Assertions.assertTrue(passwords.matches("password123", saved.getPassword()));
            org.junit.jupiter.api.Assertions.assertEquals("USER", saved.getRole());
            saved.setId(2L);
            return saved;
        });
        mvc.perform(post("/api/auth/register").contentType("application/json")
                .content("{\"username\":\"newuser\",\"password\":\"password123\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.user.role").value("USER"));
        when(users.existsByUsername("newuser")).thenReturn(true);
        mvc.perform(post("/api/auth/register").contentType("application/json")
                .content("{\"username\":\"newuser\",\"password\":\"password123\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/auth/register").contentType("application/json")
                .content("{\"username\":\"x\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }
}
