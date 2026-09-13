import { test, expect } from '@playwright/test';

test.describe('Test group', () => {
  test('seed', async ({ page }) => {
    await page.goto('https://www.automationexercise.com/');
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  });
});
