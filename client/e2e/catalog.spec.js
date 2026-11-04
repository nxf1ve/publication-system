import { test, expect } from '@playwright/test';

// API fixtures isolate UI tests; PostgreSQL integration is checked by scripts/check_postgres.py.
test.beforeEach(async ({ page }) => {
  const user = { id: 1, username: 'employee', role: 'USER' };
  let items = [
    { id: 1, title: 'Цифровая трансформация университета', authors: 'Иванов И. И.', year: 2025, type: 'Статья' },
    { id: 2, title: 'Методы анализа данных', authors: 'Сидоров П. А.', year: 2024, type: 'Монография' },
    { id: 3, title: 'Облачные платформы в образовании', authors: 'Иванов И. И.', year: 2026, type: 'Доклад' },
  ].map(item => ({ ...item, department: 'Информационные системы', owner: 'employee', ownerId: 1, status: 'На проверке' }));
  let nextId = 4;
  await page.addInitScript(() => localStorage.setItem('access_token', 'ui-test-token'));
  await page.route('**/api/auth/me', route => route.fulfill({ json: user }));
  await page.route('**/api/publications{,/**}', async route => {
    const request = route.request();
    const id = Number(request.url().split('/').pop());
    if (request.method() === 'POST') {
      const item = { ...request.postDataJSON(), id: nextId, ownerId: 1 };
      nextId += 1;
      items.push(item);
      await route.fulfill({ status: 201, json: item });
    } else if (request.method() === 'PUT') {
      const item = { ...request.postDataJSON(), id, ownerId: 1 };
      items = items.map(existing => existing.id === id ? item : existing);
      await route.fulfill({ json: item });
    } else if (request.method() === 'DELETE') {
      items = items.filter(item => item.id !== id);
      await route.fulfill({ status: 204 });
    } else await route.fulfill({ json: items });
  });
  await page.goto('/');
  await expect(page.getByRole('article')).toHaveCount(3);
});

async function addPublication(page, title = 'Тестовая публикация') {
  const form = page.locator('form');
  await form.getByLabel('Название').fill(title);
  await form.getByLabel('Авторы').fill('Тестов Т. Т.');
  await form.getByLabel('Год', { exact: true }).fill('2025');
  await form.getByRole('button', { name: 'Добавить публикацию' }).click();
  return page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

test('adds and edits a publication, preserving changes after reload', async ({ page }) => {
  const card = await addPublication(page);
  await expect(card).toBeVisible();
  await page.reload();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Редактировать' }).click();
  await page.locator('form').getByLabel('Название').fill('Изменённая публикация');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Публикация сохранена');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Изменённая публикация', exact: true })).toBeVisible();
  await expect(card).toHaveCount(0);
});

test('cancels editing without changing the saved record', async ({ page }) => {
  const card = await addPublication(page);
  await card.getByRole('button', { name: 'Редактировать' }).click();
  await page.locator('form').getByLabel('Название').fill('Несохранённое изменение');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.reload();
  await expect(card).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Несохранённое изменение' })).toHaveCount(0);
});

test('requires confirmation to delete and persists deletion', async ({ page }) => {
  const card = await addPublication(page);
  page.once('dialog', dialog => dialog.dismiss());
  await card.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(card).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(card).toHaveCount(0);
});

test('rejects empty fields and an invalid year without adding records', async ({ page }) => {
  const form = page.locator('form');
  await form.getByRole('button', { name: 'Добавить публикацию' }).click();
  await expect(page.getByRole('status')).toContainText('Укажите авторов');
  await expect(form.getByLabel('Название')).toBeFocused();
  await form.getByLabel('Название').fill('Корректное название');
  await form.getByLabel('Авторы').fill('Тестов Т. Т.');
  await form.getByLabel('Год', { exact: true }).fill('1899');
  await form.getByRole('button', { name: 'Добавить публикацию' }).click();
  await expect(page.getByRole('status')).toContainText('1900');
  await expect(form.getByLabel('Год', { exact: true })).toBeFocused();
  await expect(page.getByRole('article')).toHaveCount(3);
});

test('filters by year, author and type, combines and resets filters', async ({ page }) => {
  const filters = page.locator('.filters');
  const cards = page.getByRole('article');
  await filters.getByLabel('Год', { exact: true }).fill('2025');
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Цифровая трансформация');
  await page.getByRole('button', { name: 'Сбросить' }).click();
  await filters.getByLabel('Автор', { exact: true }).fill('  ИВАНОВ  ');
  await expect(cards).toHaveCount(2);
  await filters.getByRole('combobox', { name: 'Тип', exact: true }).selectOption('Доклад');
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Облачные платформы');
  await filters.getByLabel('Год', { exact: true }).fill('2024');
  await expect(cards).toHaveCount(0);
  await expect(page.getByText('Публикации не найдены.')).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить' }).click();
  await expect(cards).toHaveCount(3);
  await filters.getByRole('combobox', { name: 'Тип', exact: true }).selectOption('Монография');
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Методы анализа данных');
});

test('reports API failure without displaying an unsaved record', async ({ page }) => {
  await page.route('**/api/publications', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, json: {} }) : route.fallback());
  await addPublication(page);
  await expect(page.getByRole('status')).toContainText('Не удалось выполнить запрос');
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(3);
});
