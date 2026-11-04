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
server = junit_metrics(next((ROOT / 'server/target/surefire-reports').glob('TEST-*.xml')))
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
paragraph('Объект тестирования — система учёта публикаций сотрудников. В лабораторной №6 реализован клиентский прототип задач 3.1, 3.2 и 4.2: форма с валидацией, операции с публикациями и фильтрация. В данной работе автоматизирована проверка этих задач и дополнены модульные проверки серверного сервиса.')
table(['Уровень', 'Средства', 'Назначение'], [
    ['Клиентские модули', 'Vitest, V8 coverage', 'Проверка схемы Zod, localStorage и HTTP-обёртки'],
    ['Пользовательские сценарии', 'Playwright, Chromium', 'Действия через интерфейс в настоящем браузере'],
    ['Серверные модули', 'JUnit 5, Mockito, JaCoCo', 'Изолированная проверка PublicationService'],
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
    ['Устойчивость хранения', 'Повреждённые данные, ошибки чтения и записи localStorage', 'Восстановлены исходные данные либо показана ошибка без ложного сохранения'],
    ['Серверный сервис', 'Получение списка, поиск, отсутствие записи, сохранение и удаление', 'Корректные результаты и вызовы репозитория; для отсутствующей записи — текущее исключение сервиса'],
])
paragraph('Клиентские модульные тесты находятся в publicationSchema.test.js, prototypeStore.test.js и publications.test.js. Шесть браузерных сценариев реализованы в client/e2e/catalog.spec.js. Серверные проверки находятся в PublicationServiceTest.java. Репозиторий сервера и HTTP-клиент заменяются mock-объектами только в модульных тестах; браузерные сценарии работают с реальным интерфейсом и localStorage.')

heading('4. Автоматические отчёты и непрерывная интеграция')
paragraph('Клиентский workflow выполняет ESLint, Vitest и сборку; серверный — Maven verify с JUnit, Checkstyle и JaCoCo. Добавлен e2e-ci.yml: установка зависимостей и Chromium, запуск Playwright и выгрузка результатов. Все workflow запускаются при push и pull request. Браузерные отчёты сохраняются на 14 дней; шаг выгрузки выполняется также при падении тестов. Непройденные тесты завершают соответствующую job ошибкой.')
table(['Средство', 'Автоматический отчёт'], [
    ['Vitest', 'client/test-results/junit.xml; client/coverage/index.html; coverage-summary.json'],
    ['Playwright', 'client/playwright-report/index.html; client/test-results/e2e-junit.xml'],
    ['Диагностика Playwright', 'При падении — скриншот и trace в client/test-results/e2e'],
    ['JUnit / JaCoCo', 'server/target/surefire-reports; server/target/site/jacoco/index.html'],
    ['GitHub Actions', 'Существующие сводки клиента/сервера и артефакты; отдельный артефакт browser-test-reports'],
])
paragraph('Команды запуска из корня проекта в PowerShell: npm.cmd --prefix client ci; npm.cmd --prefix client exec -- playwright install chromium; npm.cmd test; npm.cmd --prefix client run test:e2e; npm.cmd --prefix client run lint; npm.cmd run build; mvn.cmd -f server/pom.xml verify. Для просмотра браузерного отчёта: npm.cmd --prefix client run test:e2e:report.')

heading('5. Результаты проверки')
paragraph('Локальная проверка выполнена 04.11.2026 в Windows, Node.js и Maven с JDK 21 (целевая версия Java проекта — 17). Ниже приведены результаты фактически выполненных прогонов. Запуск workflow на GitHub в рамках данной работы не выполнялся; конфигурация подготовлена для следующего push.')
table(['Проверка', 'Всего', 'Ошибки / пропуски', 'Результат'], [
    ['Vitest', unit[0], f'{unit[1] + unit[2]} / {unit[3]}', 'Успешно'],
    ['Playwright / Chromium', e2e[0], f'{e2e[1] + e2e[2]} / {e2e[3]}', 'Успешно'],
    ['JUnit / Mockito', server[0], f'{server[1] + server[2]} / {server[3]}', 'Успешно'],
    ['ESLint', '—', '0', 'Успешно'],
    ['Checkstyle', '—', '0', 'Успешно'],
    ['Vite build / Maven verify', '—', '—', 'Успешно'],
])
paragraph(f"Покрытие строк клиента модульными тестами — {coverage['total']['lines']['pct']}% (40 из 149). Для publicationSchema.js, prototypeStore.js и publications.js покрытие строк составляет 100%. Общее серверное покрытие JaCoCo — {covered / total * 100:.2f}% ({covered} из {total} строк), для PublicationService — 100%. Низкое общее покрытие отражает наличие компонентов и серверных классов без модульных тестов. Браузерные проверки не включаются в показатель Vitest, поэтому этот процент не описывает полноту пользовательских сценариев.")
picture('playwright.png', 'Рисунок 1 — Автоматический HTML-отчёт Playwright: шесть успешных сценариев')
picture('coverage.png', 'Рисунок 2 — Отчёт покрытия клиентского кода Vitest')
picture('jacoco.png', 'Рисунок 3 — Отчёт покрытия серверного кода JaCoCo')

heading('6. Работа с Git Flow')
paragraph('Изменения выполнены в существующей ветке feature/tests по согласованию с пользователем. Следующий этап после проверки изменений — коммит и pull request в develop с успешным CI. При подготовке отдельного релиза используется ветка release/<версия>, слияние в main с тегом и обратное слияние в develop. Прямое слияние feature/tests в main не выполнялось.')

heading('Выводы по работе')
paragraph('Для проекта настроены модульные и браузерные проверки, а также автоматическое формирование отчётов о результатах и покрытии кода. Успешно выполнены 23 клиентских модульных теста, 6 пользовательских сценариев и 5 серверных модульных тестов. Проверки подтверждают реализацию задач прототипа: валидацию формы, операции с публикациями и фильтрацию.')
paragraph('Граница проверки — клиентский прототип с localStorage и изолированный серверный сервис. Полный путь браузер → REST API → PostgreSQL, авторизация, профиль и администрирование не подтверждены данными тестами. При дальнейшем развитии проекта необходимо добавить интеграционные проверки API, базы данных и разграничения доступа. Подробные команды и соответствие требований тестам приведены в docs/testing.md.')
target = ROOT / 'Lab7_report_completed.docx'
document.save(target)
print(target)
