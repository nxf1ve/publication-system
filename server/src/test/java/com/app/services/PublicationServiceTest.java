package com.app.services;

import com.app.models.Publication;
import com.app.repositories.PublicationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicationServiceTest {
    @Mock
    private PublicationRepository repository;

    @Test
    void findAllReturnsRepositoryPublications() {
        List<Publication> publications = List.of(new Publication());
        when(repository.findAll()).thenReturn(publications);
        assertEquals(publications, new PublicationService(repository).findAll());
    }
}
