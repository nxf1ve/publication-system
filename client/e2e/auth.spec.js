import { test, expect } from '@playwright/test';

const user = { id: 1, username: 'employee', role: 'USER' };

test('registers, restores session and logs out; USER cannot open admin', async ({ page }) => {
  await page.route('**/api/auth/register', route => route.fulfill({ json: { accessToken: 'test-token', user } }));
  await page.route('**/api/auth/me', route => {
    expect(route.request().headers().authorization).toBe('Bearer test-token');
    return route.fulfill({ json: user });
  });
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await page.getByLabel(/Логин/).fill('employee@example.com');
  await page.getByLabel(/Пароль/).fill('password123');
  await page.getByRole('button', { name: 'Зарегистрироваться', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.reload();
  await expect(page.getByText('Логин: employee')).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Доступ запрещён' })).toBeVisible();
  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
});

test('shows invalid credentials and clears expired session', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, json: {} }));
  await page.goto('/login');
  await page.getByLabel(/Логин/).fill('employee');
  await page.getByLabel(/Пароль/).fill('incorrect');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Неверный логин или пароль.');
  await page.evaluate(() => localStorage.setItem('access_token', 'expired'));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: {} }));
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
});

[[409, 'Этот логин уже занят.'], [400, 'Проверьте логин и пароль.'], [503, 'Не удалось войти. Проверьте доступность сервера.']].forEach(([status, message]) => {
  test(`reports registration error ${status} and allows retry`, async ({ page }) => {
    await page.route('**/api/auth/register', route => route.fulfill({ status, json: {} }));
    await page.goto('/login');
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await page.getByLabel('Логин', { exact: true }).fill('newemployee');
    await page.getByLabel('Пароль', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Зарегистрироваться', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(message);
    await expect(page.getByRole('button', { name: 'Зарегистрироваться', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
  });
});

test('keeps token on a temporary restoration failure and links username to profile', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-token'));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/profile');
  await expect(page.getByRole('alert')).toContainText('Не удалось восстановить сессию');
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBe('test-token');
  await page.route('**/api/auth/me', route => route.fulfill({ json: user }));
  await page.reload();
  await page.getByRole('link', { name: 'employee', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Логин: employee')).toBeVisible();
});
