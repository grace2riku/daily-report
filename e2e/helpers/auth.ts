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
  // 初回コンパイル（Next.js + Prisma）を待つため、長めのタイムアウトでログインフォームを待機
  // /api/v1/auth/me のコンパイルが完了するまでローディングが表示される
  await page.waitForSelector('input[name="email"]', { timeout: 180000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // ダッシュボードにリダイレクトされるまで待機（初回コンパイル考慮）
  await page.waitForURL('/', { timeout: 180000 });
  // ダッシュボードのコンテンツが表示されるまで待機
  await page.waitForSelector('[data-testid="user-menu"]', { timeout: 90000 });
}

/**
 * ログアウト処理を実行するヘルパー関数
 */
export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('/login', { timeout: 30000 });
  // ログイン画面のフォームが表示されるまで待機
  await page.waitForSelector('input[name="email"]', { timeout: 30000 });
}
