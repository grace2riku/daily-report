import { type Page } from '@playwright/test';

/**
 * ログイン処理を実行するヘルパー関数
 */
export async function login(
  page: Page,
  email: string = 'yamada@example.com',
  password: string = 'member123'
) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // ダッシュボードにリダイレクトされるまで待機
  await page.waitForURL('/');
}

/**
 * ログアウト処理を実行するヘルパー関数
 */
export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('/login');
}
