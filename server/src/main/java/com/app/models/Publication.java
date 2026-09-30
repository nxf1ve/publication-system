package com.app.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity @Getter @Setter @NoArgsConstructor
public class Publication {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String title;
    @Column(columnDefinition = "text") private String content;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) private User author;
    @Column(nullable = false, updatable = false) private Instant createdAt = Instant.now();
    private Instant updatedAt;
}
