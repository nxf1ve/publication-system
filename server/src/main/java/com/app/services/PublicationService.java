package com.app.services;

import com.app.models.Publication;
import com.app.repositories.PublicationRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class PublicationService {
    private final PublicationRepository repository;
    public PublicationService(PublicationRepository repository) { this.repository = repository; }
    public List<Publication> findAll() { return repository.findAll(); }
    public Publication findById(Long id) { return repository.findById(id).orElseThrow(); }
    public Publication save(Publication publication) { return repository.save(publication); }
    public void delete(Long id) { repository.deleteById(id); }
}
