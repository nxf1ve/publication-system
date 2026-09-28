package com.app.models;

import jakarta.persistence.*;
import lombok.*;
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
