import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { AUTH_ACCOUNT_FILE } from '../auth-paths';

test('saved session is authenticated without using the login form', async ({ page }) => {
  const { name } = JSON.parse(readFileSync(AUTH_ACCOUNT_FILE, 'utf8'));

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/Logged in as/)).toContainText(name);
  await expect(page.getByRole('link', { name: /Logout/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Signup \/ Login/ })).toHaveCount(0);
});
