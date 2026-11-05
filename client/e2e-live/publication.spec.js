import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

test('registers, persists CRUD in PostgreSQL and restores it after a new login', async ({ page }) => {
  // No route interception: all browser requests reach Spring Boot and PostgreSQL.
  const username = `browser_${randomUUID().slice(0, 8)}`;
  const title = `Проверка PostgreSQL ${username}`;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await page.getByLabel('Логин', { exact: true }).fill(username);
  await page.getByLabel('Пароль', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Зарегистрироваться', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByRole('link', { name: 'Каталог', exact: true }).click();
  await page.locator('form').getByLabel('Название').fill(title);
  await page.locator('form').getByLabel('Авторы').fill('Тестов Т. Т.');
  await page.getByRole('button', { name: 'Добавить публикацию' }).click();
  const card = page.getByRole('article').filter({ hasText: username });
  await expect(card.getByRole('heading')).toHaveText(title);
  await page.reload();
  await card.getByRole('button', { name: 'Редактировать' }).click();
  await page.locator('form').getByLabel('Название').fill(`${title} изменено`);
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(card.getByRole('heading')).toHaveText(`${title} изменено`);
  await page.getByRole('button', { name: 'Выйти' }).click();
  await page.getByLabel('Логин', { exact: true }).fill(username);
  await page.getByLabel('Пароль', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByRole('link', { name: 'Каталог', exact: true }).click();
  await expect(card.getByRole('heading')).toHaveText(`${title} изменено`);
  page.once('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(card).toHaveCount(0);
});
