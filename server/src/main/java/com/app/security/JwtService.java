package com.app.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/** JWT building block; wire it into an authentication filter when auth endpoints are implemented. */
@Service
public class JwtService {
    private final SecretKey key;
    private final long expirationMs;
    public JwtService(@Value("${security.jwt.secret:change-me-change-me-change-me-change-me}") String secret,
                      @Value("${security.jwt.expiration-ms:86400000}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.expirationMs = expirationMs;
    }
    public String generate(String username) {
        Date now = new Date();
        return Jwts.builder().subject(username).issuedAt(now).expiration(new Date(now.getTime() + expirationMs)).signWith(key).compact();
    }
    public String subject(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject(); }
}
