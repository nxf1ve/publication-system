package com.app.services;

import com.app.models.Publication;
import com.app.repositories.PublicationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
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

    @Test
    void findByIdReturnsExistingPublication() {
        Publication publication = new Publication();
        when(repository.findById(1L)).thenReturn(Optional.of(publication));
        assertEquals(publication, new PublicationService(repository).findById(1L));
    }

    @Test
    void findByIdThrowsForMissingPublication() {
        when(repository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> new PublicationService(repository).findById(1L));
    }

    @Test
    void saveReturnsPersistedPublication() {
        Publication input = new Publication();
        Publication persisted = new Publication();
        when(repository.save(input)).thenReturn(persisted);
        assertEquals(persisted, new PublicationService(repository).save(input));
    }

    @Test
    void deleteRemovesPublicationById() {
        new PublicationService(repository).delete(1L);
        verify(repository).deleteById(1L);
    }
}
