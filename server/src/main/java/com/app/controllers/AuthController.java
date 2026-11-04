package com.app.controllers;

import com.app.models.User;
import com.app.repositories.UserRepository;
import com.app.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtService jwt;

    public AuthController(UserRepository users, PasswordEncoder passwords, JwtService jwt) {
        this.users = users;
        this.passwords = passwords;
        this.jwt = jwt;
    }

    public record Credentials(
            @NotBlank @Pattern(regexp = "[a-zA-Z0-9_.-]{3,50}") String username,
            @NotBlank @Size(min = 8, max = 72) String password) { }
    public record Account(Long id, String username, String role) { }
    public record Session(String accessToken, Account user) { }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Session register(@Valid @RequestBody Credentials credentials) {
        validatePasswordBytes(credentials.password());
        if (users.existsByUsername(credentials.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        User user = new User();
        user.setUsername(credentials.username());
        user.setPassword(passwords.encode(credentials.password()));
        user.setRole("USER");
        try {
            return session(users.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
    }

    @PostMapping("/login")
    public Session login(@Valid @RequestBody Credentials credentials) {
        validatePasswordBytes(credentials.password());
        User user = users.findByUsername(credentials.username()).orElse(null);
        if (user == null || !passwords.matches(credentials.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        return session(user);
    }

    @GetMapping("/me")
    public Account me(Authentication authentication) {
        return account(users.findByUsername(authentication.getName()).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED)));
    }

    private Session session(User user) {
        return new Session(jwt.generate(user.getUsername()), account(user));
    }

    private void validatePasswordBytes(String password) {
        if (password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password exceeds 72 UTF-8 bytes");
        }
    }

    private Account account(User user) {
        return new Account(user.getId(), user.getUsername(), user.getRole());
    }
}
