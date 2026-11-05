# Автоматическое тестирование (лабораторная работа №7)

Объём проверки — задачи прототипа из лабораторной №6: 3.1 (форма и валидация),
3.2 (добавление, изменение и удаление), 4.2 (фильтрация), а также реализованные
регистрация, вход/выход, восстановление сессии, профиль и права USER/ADMIN.
Каталог использует серверное API. Браузерные тесты подменяют ответы API
через Playwright и не требуют запущенных сервера и PostgreSQL. Проверки
`prototypeStore.test.js` относятся к сохраненному модулю старого localStorage-прототипа.

## Запуск в PowerShell

Из корня проекта:

```powershell
npm.cmd --prefix client ci
npm.cmd --prefix client exec -- playwright install chromium
npm.cmd test
npm.cmd --prefix client run test:e2e
npm.cmd --prefix client run lint
npm.cmd run build
mvn.cmd -f server/pom.xml verify
```

Для сервера нужен JDK 17 или совместимая более новая версия и Maven.
Playwright сам запускает Vite на `127.0.0.1:5173`. В CI запускается отдельный
экземпляр; локально может использоваться уже запущенный сервер на этом адресе.
Каждый браузерный тест получает отдельный контекст и независимое localStorage.
Vitest ищет только `src/**/*.test.{js,jsx}`, Playwright — файлы в `e2e`.

## Соответствие требованиям

| Задача | Автоматические проверки | Файлы |
|---|---|---|
| 3.1 | Обязательные поля, границы длины названия и года, тип и подразделение; сообщение и фокус при ошибке | `publicationSchema.test.js`, `e2e/catalog.spec.js` |
| 3.2 | Добавление, редактирование, отмена, подтверждение/отмена удаления; сохранение после перезагрузки | `prototypeStore.test.js`, `e2e/catalog.spec.js` |
| 4.2 | Каждый фильтр, сочетание фильтров, регистр и пробелы автора, пустой результат, сброс | `e2e/catalog.spec.js` |
| Устойчивость | Ошибка API без отображения несохраненной записи; отдельно — поврежденное и недоступное хранилище старого прототипа | `prototypeStore.test.js`, `e2e/catalog.spec.js` |
| Серверный сервис | Список, найденная/отсутствующая запись, сохранение, удаление | `PublicationServiceTest.java` |
| Авторизация | Регистрация, восстановление сессии, выход, недействительный токен и запрет ADMIN-раздела для USER | `e2e/auth.spec.js`, `AuthenticationTest.java` |
| HTTP-сессия клиента | Bearer-заголовок, удаление токена и событие при 401, сохранение токена при 403/503 и ошибке входа | `http.test.js` |
| Каталог API | Реальные контроллер, валидация, JWT-фильтр и сервис; ответы 201/204/400/401/403/404; права владельца/ADMIN и защита ownerId/status от подмены | `PublicationControllerTest.java` |
| Ошибки интерфейса | Повтор загрузки; ошибки 400/403/404 при изменении и удалении; истечение сессии; скрытие чужих действий; ошибки регистрации | `e2e/catalog.spec.js`, `e2e/auth.spec.js` |
| PostgreSQL | Регистрация и вход по HTTP, реальная запись/чтение/обновление/удаление, валидация, запрет чужих изменений | `PublicationIntegrationTest.java` |
| Полный пользовательский сценарий | Настоящий браузер → API → PostgreSQL; регистрация, CRUD, перезагрузка, выход и повторный вход | `e2e-live/publication.spec.js` |

`publications.test.js` проверяет адреса и параметры вызовов HTTP-обёртки с mock,
а не взаимодействие с работающим сервером.

## Отчёты

| Средство | Результат |
|---|---|
| Vitest | `client/test-results/junit.xml`, `client/coverage/index.html`, `client/coverage/coverage-summary.json` |
| Playwright | `client/playwright-report/index.html`, `client/test-results/e2e-junit.xml`; при падении — скриншот и trace в `client/test-results/e2e/` |
| Maven | `server/target/surefire-reports/`, `server/target/site/jacoco/index.html` |
| Playwright с реальным API | `client/playwright-live-report/index.html`, `client/test-results/live-junit.xml`; диагностика в `client/test-results/live/` |

Интерактивный просмотр браузерного отчёта:

```powershell
npm.cmd --prefix client run test:e2e:report
```

GitHub Actions запускает клиентские, серверные и браузерные проверки при push
и pull request. Отчёты выгружаются шагами с `if: always()`, в том числе при
падении тестов. Браузерные артефакты хранятся 14 дней. Падение теста завершает
соответствующую job ошибкой. Если установка зависимостей не завершилась,
тестовый отчёт ещё не существует.

Покрытие Vitest относится только к модульному прогону и не учитывает Playwright.
Серверные проверки без БД используют Mockito для репозиториев. `AuthenticationTest`
проверяет JWT и Spring Security через MockMvc с настоящими компонентами безопасности.
Браузерные тесты проверяют интерфейс с ответами API, подготовленными в тестах,
и не подтверждают полный путь браузер → API → БД. Для этого добавлены отдельные
интеграционные проверки ниже. Настоящее API и PostgreSQL также
отдельно проверяются командой `python scripts/check_postgres.py` при запущенном
сервере; см. [postgres.md](postgres.md). Профиль показывает сведения сессии,
админ-панель остается заготовкой.

Документы `Lab6_report_completed.docx` и `Lab7_report_completed.docx`
хранятся локально в `../publication-system-reports/` и исключены из Git.
Генератор `docs/lab7/create_report.py` сохраняет результат туда же.
Снимки в `docs/lab7` обновлены по локальному прогону 05.11.2026. Актуальное число
тестов и покрытие нужно смотреть в результатах текущего прогона и GitHub Actions.

## Интеграция с настоящей PostgreSQL

Используется **отдельная одноразовая БД `publication_system_test`**. Hibernate
создаёт и удаляет её таблицы (`create-drop`); рабочих данных в ней быть не должно.
URL другой базы не активирует JUnit-тест, а live-конфигурация Playwright его отклоняет.
На Windows с установленным PostgreSQL:

```powershell
# Однократно создать тестовую БД; пароль задаётся для вашего тестового PostgreSQL.
$env:PGPASSWORD = 'postgres'
createdb -h localhost -U postgres publication_system_test
$env:TEST_DB_URL = 'jdbc:postgresql://localhost:5432/publication_system_test'
$env:TEST_DB_USERNAME = 'postgres'
$env:TEST_DB_PASSWORD = 'postgres'
mvn.cmd -B -f server/pom.xml clean verify
npm.cmd --prefix client run test:e2e:live
```

Если БД уже существует, повторять `createdb` не нужно. Без `TEST_DB_URL`
`PublicationIntegrationTest` явно отмечается как skipped, остальные серверные тесты
выполняются. Полный локальный прогон и workflow `PostgreSQL integration` задают URL:
интеграционный тест должен пройти **без пропуска**.

Live-прогон сам запускает Spring Boot на 18080 и Vite на 5173 и завершает их после
проверки. Эти порты должны быть свободны. В отличие от обычного `test:e2e`, ответы
API не подменяются. Тесты JUnit и live-прогон запускаются последовательно, так как
используют одну тестовую БД. CI поднимает PostgreSQL 16 service, выполняет Maven,
затем live Playwright и сохраняет JUnit, JaCoCo, HTML и диагностику при падении.

Состояние на 05.11.2026: 32 модульных теста клиента, 18 браузерных проверок с API-
фикстурами, 32 серверные проверки (включая PostgreSQL) и отдельный live-сценарий.
Будущие задачи из `implementation-plan.md` (файлы, поиск/пагинация, аналитика,
полноценное управление пользователями) не считаются реализованными или проверенными.

## Git Flow

Дополнительные проверки выполняются в `feature/test-coverage`, созданной от
`feature/auth-postgres`: они зависят от нового каталога и JWT-авторизации.
Порядок интеграции: сначала PR из `feature/auth-postgres` в `develop`, затем PR
из `feature/test-coverage` в `develop` с успешным CI. Слияние сохраняет историю коммитов.
Релиз при
необходимости готовится в `release/<версия>`, затем сливается в `main` с тегом
и обратно в `develop`. Прямое слияние feature-ветки в `main` не используется.
