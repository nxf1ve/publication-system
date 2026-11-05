"""Build the lab report using the supplied Lab 6 document as a style template.

Usage: python docs/lab7/create_report.py path/to/Лаб6.docx
Requires python-docx; run project checks and capture report screenshots first.
"""
import csv
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm


ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path(__file__).resolve().parent
document = Document(sys.argv[1])

# Keep the original title page, paragraph/run formatting, styles and page setup.
for paragraph in document.paragraphs[:22]:
    replacement = paragraph.text.replace('№6', '№7').replace(
        'Тестирование программного обеспечения', 'Конструирование программного обеспечения'
    ).replace('Проверила:', 'Проверил:')
    if replacement != paragraph.text:
        paragraph.runs[0].text = replacement
        for run in paragraph.runs[1:]:
            run.text = ''
start = document.paragraphs[22]._p
body = document._element.body
for element in list(body)[list(body).index(start):]:
    if not element.tag.endswith('}sectPr'):
        body.remove(element)


def heading(text):
    document.add_paragraph(text, 'Heading 1')


def paragraph(text):
    p = document.add_paragraph(text, 'Normal')
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return p


def table(headers, rows):
    t = document.add_table(rows=1, cols=len(headers))
    t.style = 'Table Grid'
    for cell, value in zip(t.rows[0].cells, headers):
        cell.text = value
    for row in rows:
        for cell, value in zip(t.add_row().cells, row):
            cell.text = str(value)


def picture(name, caption):
    p = document.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(ASSETS / name), width=Cm(16))
    p = document.add_paragraph(caption, 'List Paragraph')
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER


def junit_metrics(path):
    root = ET.parse(path).getroot()
    suites = [root] if root.tag == 'testsuite' else root.findall('.//testsuite')
    return tuple(sum(int(s.get(key, '0')) for s in suites)
                 for key in ('tests', 'failures', 'errors', 'skipped'))


unit = junit_metrics(ROOT / 'client/test-results/junit.xml')
e2e = junit_metrics(ROOT / 'client/test-results/e2e-junit.xml')
server_reports = list((ROOT / 'server/target/surefire-reports').glob('TEST-*.xml'))
server = tuple(sum(junit_metrics(path)[i] for path in server_reports) for i in range(4))
live = junit_metrics(ROOT / 'client/test-results/live-junit.xml')
for name, metrics in [('Vitest', unit), ('Playwright', e2e), ('JUnit', server), ('Live', live)]:
    if metrics[1] or metrics[2] or metrics[3]:
        raise SystemExit(f'{name}: failed or skipped tests; complete the full test run before reporting success.')
coverage = json.loads((ROOT / 'client/coverage/coverage-summary.json').read_text())
with (ROOT / 'server/target/site/jacoco/jacoco.csv').open(newline='') as source:
    jacoco = list(csv.DictReader(source))
covered = sum(int(r['LINE_COVERED']) for r in jacoco)
total = covered + sum(int(r['LINE_MISSED']) for r in jacoco)

heading('1. Задание.')
document.paragraphs[-1].paragraph_format.page_break_before = True
paragraph('Тема: Инфраструктура разработки проекта.')
paragraph('Порядок выполнения:')
for text in [
    'Выбрать и настроить среду для автоматического тестирования проекта.',
    'Спроектировать и реализовать тесты (модульные, автоматизированные от лица пользователя, …), подтверждающие выполнение всех запланированных задач.',
    'Настроить автоматические отчеты о тестировании.',
]:
    document.add_paragraph(text, 'List Paragraph')

heading('2. Выбор и настройка среды тестирования')
paragraph('Объект тестирования — обновлённая система учёта публикаций сотрудников. Проверяются задачи 3.1, 3.2 и 4.2 (форма, CRUD и фильтрация), а также регистрация, вход, восстановление сессии и права USER/ADMIN. Каталог подключён к REST API и PostgreSQL. Объём работы ограничен реализованными задачами; будущие функции из плана проекта не заявляются готовыми.')
table(['Уровень', 'Средства', 'Назначение'], [
    ['Клиентские модули', 'Vitest, V8 coverage', 'Проверка схемы Zod, localStorage и HTTP-обёртки'],
    ['Пользовательские сценарии', 'Playwright, Chromium', 'Действия через интерфейс в настоящем браузере'],
    ['Серверные проверки', 'JUnit 5, Mockito, MockMvc, JaCoCo', 'Сервис, контроллеры, валидация, JWT и разграничение доступа'],
    ['Интеграция', 'Spring Boot, HTTP, PostgreSQL, Playwright', 'Настоящая БД и полный пользовательский сценарий без подмены API'],
    ['Автоматический запуск', 'GitHub Actions', 'Проверки при push и pull request, сохранение отчётов'],
])
paragraph('Существующие Vitest, JUnit и workflow сохранены и расширены. Для Playwright добавлены отдельный конфигурационный файл и каталог client/e2e. Vitest ограничен тестами src/**/*.test.{js,jsx}, поэтому браузерные тесты не попадают в модульный прогон. Playwright автоматически запускает Vite; каждый сценарий использует отдельный контекст браузера и независимое localStorage.')

heading('3. Проектирование и реализация тестов')
table(['Задача', 'Проверки', 'Ожидаемый результат'], [
    ['3.1. Форма и валидация', 'Пустые обязательные поля, длина названия 3–200, границы года 1900–следующий год, тип и подразделение', 'Ошибочные данные отклоняются; допустимые границы принимаются'],
    ['3.1. Обратная связь', 'Отправка пустой формы и года 1899 через браузер', 'Показано сообщение, фокус на ошибочном поле, запись не добавлена'],
    ['3.2. Добавление и изменение', 'Создание, перезагрузка, редактирование и повторная перезагрузка', 'Созданная запись и изменения сохраняются'],
    ['3.2. Отмена и удаление', 'Отмена редактирования, отмена и подтверждение удаления', 'Отмена сохраняет исходную запись; подтверждение удаляет её окончательно'],
    ['4.2. Фильтрация', 'Год, автор, тип отдельно и совместно; регистр и пробелы автора; сброс и пустой результат', 'Отображаются только подходящие записи, сброс возвращает весь список'],
    ['Устойчивость API', 'Повтор загрузки, 400/403/404/503 при операциях', 'Ошибка показана; несохранённые данные не выдаются за сохранённые, повтор доступен'],
    ['Авторизация', 'Регистрация, вход, выход, восстановление, истечение сессии, профиль и права USER/ADMIN', 'Корректная навигация, Bearer-заголовок и защита операций'],
    ['PostgreSQL', 'HTTP CRUD и SQL-чтение результата через JPA, вход, валидация и запрет чужих операций', 'Данные действительно записаны, изменены и удалены'],
    ['Серверный сервис', 'Получение списка, поиск, отсутствие записи, сохранение и удаление', 'Корректные результаты и вызовы репозитория; для отсутствующей записи — текущее исключение сервиса'],
])
paragraph('Клиентские модульные проверки находятся в publicationSchema.test.js, publications.test.js, http.test.js и сохранённом prototypeStore.test.js старого прототипа. Обычные браузерные тесты client/e2e проверяют интерфейс с подготовленными ответами API. PublicationControllerTest использует настоящие контроллер, сервис каталога, валидацию и Spring Security, подменяя только репозитории. PublicationIntegrationTest выполняет запросы по HTTP к Spring Boot и настоящей PostgreSQL. Отдельный client/e2e-live/publication.spec.js выполняет пользовательский сценарий без перехвата API.')

heading('4. Автоматические отчёты и непрерывная интеграция')
paragraph('Клиентский workflow выполняет ESLint, Vitest и сборку; серверный — Maven verify с JUnit, Checkstyle и JaCoCo. Добавлен e2e-ci.yml: установка зависимостей и Chromium, запуск Playwright и выгрузка результатов. Все workflow запускаются при push и pull request. Браузерные отчёты сохраняются на 14 дней; шаг выгрузки выполняется также при падении тестов. Непройденные тесты завершают соответствующую job ошибкой.')
paragraph('Добавлен integration-ci.yml с PostgreSQL 16 service: Maven clean verify, затем Playwright с настоящим сервером и базой, выгрузка JUnit, JaCoCo, HTML и диагностики. Используется отдельная одноразовая publication_system_test с create-drop. Рабочая база publication_system не используется. Без TEST_DB_URL интеграционный JUnit-тест пропускается; полный прогон и CI задают URL и выполняют его без пропуска. Live-конфигурация принимает только адрес тестовой БД, сама запускает API на 18080 и Vite на 5173 и останавливает их после проверки.')
table(['Средство', 'Автоматический отчёт'], [
    ['Vitest', 'client/test-results/junit.xml; client/coverage/index.html; coverage-summary.json'],
    ['Playwright', 'client/playwright-report/index.html; client/test-results/e2e-junit.xml'],
    ['Диагностика Playwright', 'При падении — скриншот и trace в client/test-results/e2e'],
    ['JUnit / JaCoCo', 'server/target/surefire-reports; server/target/site/jacoco/index.html'],
    ['Live Playwright', 'client/playwright-live-report/index.html; client/test-results/live-junit.xml'],
    ['GitHub Actions', 'Существующие сводки клиента/сервера и артефакты; отдельный артефакт browser-test-reports'],
])
paragraph('Команды запуска из корня проекта в PowerShell: npm.cmd --prefix client ci; npm.cmd --prefix client exec -- playwright install chromium; npm.cmd test; npm.cmd --prefix client run test:e2e; npm.cmd --prefix client run lint; npm.cmd run build; mvn.cmd -f server/pom.xml verify. Для просмотра браузерного отчёта: npm.cmd --prefix client run test:e2e:report.')

heading('5. Результаты проверки')
paragraph('Локальная проверка выполнена 05.11.2026 в Windows с Maven/JDK 21 (целевая версия Java — 17), Node.js, Chromium и PostgreSQL 16. Ниже приведены результаты фактических прогонов. GitHub Actions в рамках данной работы не запускался; workflow подготовлены для следующего push.')
table(['Проверка', 'Всего', 'Ошибки / пропуски', 'Результат'], [
    ['Vitest', unit[0], f'{unit[1] + unit[2]} / {unit[3]}', 'Успешно'],
    ['Playwright / Chromium', e2e[0], f'{e2e[1] + e2e[2]} / {e2e[3]}', 'Успешно'],
    ['JUnit / MockMvc / PostgreSQL', server[0], f'{server[1] + server[2]} / {server[3]}', 'Успешно'],
    ['Live Playwright / API / PostgreSQL', live[0], f'{live[1] + live[2]} / {live[3]}', 'Успешно'],
    ['ESLint', '—', '0', 'Успешно'],
    ['Checkstyle', '—', '0', 'Успешно'],
    ['Vite build / Maven verify', '—', '—', 'Успешно'],
])
paragraph(f"Покрытие строк клиента модульными тестами — {coverage['total']['lines']['pct']}% ({coverage['total']['lines']['covered']} из {coverage['total']['lines']['total']}). Для HTTP-клиента, схемы публикации, хранилища прототипа и HTTP-обёртки покрытие строк составляет 100%. Браузерные проверки компонентов не входят в метрику Vitest. Общее серверное покрытие JaCoCo — {covered / total * 100:.2f}% ({covered} из {total} строк); для PublicationCatalogService и PublicationController — 100%. Сам по себе процент покрытия не подтверждает все возможные сценарии: соответствие реализованным задачам приведено в таблице проверок.")
picture('playwright.png', f'Рисунок 1 — HTML-отчёт Playwright: {e2e[0]} успешных сценариев')
picture('coverage.png', 'Рисунок 2 — Отчёт покрытия клиентского кода Vitest')
picture('jacoco.png', 'Рисунок 3 — Отчёт покрытия серверного кода JaCoCo')
picture('live.png', 'Рисунок 4 — Полный браузерный сценарий с настоящими API и PostgreSQL')

heading('6. Работа с Git Flow')
paragraph('Новые проверки выполнены в feature/test-coverage, созданной от feature/auth-postgres, поскольку зависят от обновлённой функциональности. Порядок интеграции — сначала feature/auth-postgres в develop, затем feature/test-coverage в develop через PR с успешным CI. Релиз готовится через release/<версия> с последующим слиянием в main, тегом и возвратом в develop. Прямого слияния feature в main не выполнялось.')

heading('Выводы по работе')
paragraph(f'Успешно выполнены {unit[0]} клиентских модульных теста, {e2e[0]} браузерных проверок с подготовленными ответами API, {server[0]} серверных проверок и {live[0]} полный браузерный сценарий. Настроены среда тестирования, автоматический запуск и отчёты. Проверяются текущие задачи формы, CRUD, фильтрации, регистрации, сессии и разграничения доступа, включая настоящее хранение в PostgreSQL.')
paragraph('Полный браузерный сценарий подтверждает регистрацию, создание и редактирование публикации, сохранение после перезагрузки и нового входа, а также удаление. Это не означает проверку всех комбинаций входных данных. Загрузка файлов, поиск и пагинация, полноценная админ-панель и аналитика ещё не реализованы и в объём подтверждённых задач не включены. Команды и матрица требований приведены в docs/testing.md.')
reports_directory = ROOT.parent / 'publication-system-reports'
reports_directory.mkdir(parents=True, exist_ok=True)
target = reports_directory / 'Lab7_report_completed.docx'
document.save(target)
print(target)
