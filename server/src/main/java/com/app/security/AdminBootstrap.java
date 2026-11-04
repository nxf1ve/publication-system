package com.app.security;

import com.app.models.User;
import com.app.repositories.UserRepository;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Creates the initial administrator only when explicitly configured. */
@Component
public class AdminBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final String username;
    private final String password;

    public AdminBootstrap(UserRepository users, PasswordEncoder passwords,
                          @Value("${app.admin.username:}") String username,
                          @Value("${app.admin.password:}") String password) {
        this.users = users;
        this.passwords = passwords;
        this.username = username;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (username.isBlank() && password.isBlank()) return;
        if (!username.matches("[a-zA-Z0-9_.@+-]{3,50}") || password.length() < 8
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Configure ADMIN_USERNAME and ADMIN_PASSWORD (8-72 UTF-8 bytes)");
        }
        var existing = users.findByUsername(username);
        if (existing.isPresent()) {
            if (!"ADMIN".equals(existing.get().getRole())) {
                throw new IllegalStateException("Administrator username is already occupied by a non-admin account");
            }
            return;
        }
        User admin = new User();
        admin.setUsername(username);
        admin.setPassword(passwords.encode(password));
        admin.setRole("ADMIN");
        users.save(admin);
    }
}
