# Автоматическое тестирование (лабораторная работа №7)

Объём проверки — задачи прототипа из лабораторной №6: 3.1 (форма и валидация),
3.2 (добавление, изменение и удаление), 4.2 (фильтрация).
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

`publications.test.js` проверяет адреса и параметры вызовов HTTP-обёртки с mock,
а не взаимодействие с работающим сервером.

## Отчёты

| Средство | Результат |
|---|---|
| Vitest | `client/test-results/junit.xml`, `client/coverage/index.html`, `client/coverage/coverage-summary.json` |
| Playwright | `client/playwright-report/index.html`, `client/test-results/e2e-junit.xml`; при падении — скриншот и trace в `client/test-results/e2e/` |
| Maven | `server/target/surefire-reports/`, `server/target/site/jacoco/index.html` |

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
Серверные проверки используют Mockito для репозиториев. `AuthenticationTest`
проверяет JWT и Spring Security через MockMvc с настоящими компонентами безопасности.
Браузерные тесты проверяют интерфейс с ответами API, подготовленными в тестах,
и не подтверждают полный путь браузер → API → БД. Настоящее API и PostgreSQL
отдельно проверяются командой `python scripts/check_postgres.py` при запущенном
сервере; см. [postgres.md](postgres.md). Профиль показывает сведения сессии,
админ-панель остается заготовкой.

Файлы `Lab6_report_completed.docx`, `Lab7_report_completed.docx` и снимки
в `docs/lab7` фиксируют предыдущий этап прототипа. Актуальное число тестов
и покрытие нужно смотреть в результатах текущего прогона и GitHub Actions.

## Git Flow

Функциональность авторизации и каталога находится в `feature/auth-postgres`,
зависимые тесты и CI — в `feature/tests`. Обе ветки включают актуальный `develop`.
Порядок интеграции: сначала PR из `feature/auth-postgres` в `develop`, затем PR
из `feature/tests` в `develop` с успешным CI. Слияние сохраняет историю коммитов.
Релиз при
необходимости готовится в `release/<версия>`, затем сливается в `main` с тегом
и обратно в `develop`. Прямое слияние feature-ветки в `main` не используется.
