package com.app.controllers;

import com.app.models.Publication;
import com.app.services.PublicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/publications")
public class PublicationController {
    private final PublicationService service;
    public PublicationController(PublicationService service) { this.service = service; }
    @GetMapping public List<Publication> all() { return service.findAll(); }
    @GetMapping("/{id}") public Publication one(@PathVariable Long id) { return service.findById(id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Publication create(@Valid @RequestBody Publication publication) { return service.save(publication); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id) { service.delete(id); }
}
