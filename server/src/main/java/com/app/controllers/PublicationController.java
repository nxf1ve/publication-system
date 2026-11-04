package com.app.controllers;

import com.app.models.PublicationRequest;
import com.app.services.PublicationCatalogService;
import com.app.services.PublicationCatalogService.View;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/publications")
public class PublicationController {
    private final PublicationCatalogService service;
    public PublicationController(PublicationCatalogService service) { this.service = service; }
    @GetMapping public List<View> all() { return service.all(); }
    @GetMapping("/{id}") public View one(@PathVariable Long id) { return service.one(id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public View create(@Valid @RequestBody PublicationRequest request, Principal user) { return service.create(request, user.getName()); }
    @PutMapping("/{id}")
    public View update(@PathVariable Long id, @Valid @RequestBody PublicationRequest request, Principal user) { return service.update(id, request, user.getName()); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Principal user) { service.delete(id, user.getName()); }
}
