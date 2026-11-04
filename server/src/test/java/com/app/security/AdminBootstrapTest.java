package com.app.security;

import com.app.models.User;
import com.app.repositories.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AdminBootstrapTest {
    private final UserRepository users = mock(UserRepository.class);
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    @Test
    void disabledWithoutCredentials() {
        new AdminBootstrap(users, passwords, "", "").run();
        verifyNoInteractions(users);
    }

    @Test
    void createsAdminWithHashedPassword() {
        when(users.findByUsername("admin")).thenReturn(Optional.empty());
        new AdminBootstrap(users, passwords, "admin", "test-password").run();
        var captured = ArgumentCaptor.forClass(User.class);
        verify(users).save(captured.capture());
        assertEquals("ADMIN", captured.getValue().getRole());
        assertTrue(passwords.matches("test-password", captured.getValue().getPassword()));
    }

    @Test
    void doesNotPromoteExistingEmployee() {
        User employee = new User();
        when(users.findByUsername("admin")).thenReturn(Optional.of(employee));
        assertThrows(IllegalStateException.class, () -> new AdminBootstrap(users, passwords, "admin", "test-password").run());
        assertEquals("USER", employee.getRole());
    }
}
