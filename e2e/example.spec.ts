import { expect, test } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/営業日報システム/);
  });
});
