package com.app.services;

import com.app.models.Publication;
import com.app.models.PublicationRequest;
import com.app.models.User;
import com.app.repositories.PublicationRepository;
import com.app.repositories.UserRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PublicationCatalogService {
    private final PublicationRepository publications;
    private final UserRepository users;

    public PublicationCatalogService(PublicationRepository publications, UserRepository users) {
        this.publications = publications;
        this.users = users;
    }

    public record View(Long id, String title, String authors, Integer year, String type,
                       String department, String owner, String status, Long ownerId) { }

    public List<View> all() { return publications.findAll().stream().map(this::view).toList(); }
    public View one(Long id) { return view(find(id)); }

    public View create(PublicationRequest request, String username) {
        Publication publication = new Publication();
        publication.setAuthor(account(username));
        apply(publication, request);
        return view(publications.save(publication));
    }

    public View update(Long id, PublicationRequest request, String username) {
        Publication publication = find(id);
        checkOwner(publication, username);
        apply(publication, request);
        publication.setUpdatedAt(Instant.now());
        return view(publications.save(publication));
    }

    public void delete(Long id, String username) {
        Publication publication = find(id);
        checkOwner(publication, username);
        publications.delete(publication);
    }

    private Publication find(Long id) {
        return publications.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private User account(String username) {
        return users.findByUsername(username).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private void checkOwner(Publication publication, String username) {
        User user = account(username);
        if (!"ADMIN".equals(user.getRole()) && !publication.getAuthor().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    private void apply(Publication publication, PublicationRequest request) {
        publication.setTitle(request.title().trim());
        publication.setAuthors(request.authors().trim());
        publication.setYear(request.year());
        publication.setType(request.type());
        publication.setDepartment(request.department());
        publication.setOwner(request.owner().trim());
    }

    private View view(Publication publication) {
        return new View(publication.getId(), publication.getTitle(), publication.getAuthors(), publication.getYear(),
                publication.getType(), publication.getDepartment(), publication.getOwner(), publication.getStatus(), publication.getAuthor().getId());
    }
}
