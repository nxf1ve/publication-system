# Publication System — server

Spring Boot backend prepared for the component architecture from the specification:

- `controllers` — HTTP/REST entry points;
- `services` — application and business logic;
- `repositories` — Spring Data JPA persistence;
- `models` — PostgreSQL entities and DTO extension point;
- `security` — stateless Spring Security configuration and BCrypt password hashing.

Run PostgreSQL with database `publication_system`, then start the application:

```bash
mvn spring-boot:run
```

Connection values can be overridden with `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` and `SERVER_PORT`.
The current REST base path is `/api/publications`; authentication endpoints can be added under `/api/auth`.
