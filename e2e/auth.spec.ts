import { expect, test } from '@playwright/test';

import { login, logout } from './helpers/auth';

/**
 * 認証機能 E2Eテスト (E2E-001)
 *
 * テスト仕様書のE2E-001に対応するログインシナリオをテストする。
 * - E2E-001-01: 正常ログイン
 * - E2E-001-02: ログイン失敗
 * - E2E-001-03: ログアウト
 *
 * テストデータ:
 * - 一般営業: yamada@example.com / member123
 * - 上長: manager@example.com / manager123
 * - 管理者: admin@example.com / admin123
 */
test.describe('E2E-001: ログインシナリオ', () => {
  test.describe('E2E-001-01: 正常ログイン', () => {
    test('メールアドレスとパスワードを入力してログインするとダッシュボードに遷移する', async ({
      page,
    }) => {
      // 1. ログイン画面を表示
      await page.goto('/login');

      // ローディングが終わるまで待機
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });

      // ログイン画面のタイトルが表示されていることを確認（CardTitleはdiv要素なのでテキストで検索）
      await expect(
        page.locator('[data-slot="card-title"]').getByText('営業日報システム')
      ).toBeVisible();

      // 2. メールアドレスを入力
      const emailInput = page.locator('input[name="email"]');
      await emailInput.fill('yamada@example.com');

      // 3. パスワードを入力
      const passwordInput = page.locator('input[name="password"]');
      await passwordInput.fill('member123');

      // 4. ログインボタンをクリック
      const loginButton = page.getByRole('button', { name: 'ログイン' });
      await loginButton.click();

      // 5. ダッシュボードに遷移することを確認
      await page.waitForURL('/');

      // ダッシュボードのコンテンツが表示されていることを確認
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();
    });

    test('上長アカウントでログインできる', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });

      await page.fill('input[name="email"]', 'manager@example.com');
      await page.fill('input[name="password"]', 'manager123');
      await page.click('button[type="submit"]');

      await page.waitForURL('/', { timeout: 30000 });
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();
    });

    test('管理者アカウントでログインできる', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });

      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');

      await page.waitForURL('/', { timeout: 30000 });
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();
    });
  });

  test.describe('E2E-001-02: ログイン失敗', () => {
    test('誤ったパスワードでログインするとエラーメッセージが表示される', async ({ page }) => {
      // 1. ログイン画面を表示
      await page.goto('/login');
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });

      // 2. 正しいメールアドレスと誤ったパスワードを入力
      await page.fill('input[name="email"]', 'yamada@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');

      // 3. ログインボタンをクリック
      await page.click('button[type="submit"]');

      // 4. エラーメッセージが表示されることを確認
      await expect(
        page.getByText('メールアドレスまたはパスワードが正しくありません')
      ).toBeVisible();

      // ログイン画面に留まっていることを確認
      await expect(page).toHaveURL('/login');
    });

    test('存在しないメールアドレスでログインするとエラーメッセージが表示される', async ({
      page,
    }) => {
      await page.goto('/login');
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'anypassword');
      await page.click('button[type="submit"]');

      await expect(
        page.getByText('メールアドレスまたはパスワードが正しくありません')
      ).toBeVisible();
      await expect(page).toHaveURL('/login');
    });

    test('メールアドレスを空にして送信するとバリデーションエラーが表示される', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });

      // パスワードのみ入力
      await page.fill('input[name="password"]', 'member123');
      await page.click('button[type="submit"]');

      // バリデーションエラーメッセージが表示される
      await expect(page.getByText('メールアドレスを入力してください')).toBeVisible();
    });

    test('パスワードを空にして送信するとバリデーションエラーが表示される', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });

      // メールアドレスのみ入力
      await page.fill('input[name="email"]', 'yamada@example.com');
      await page.click('button[type="submit"]');

      // バリデーションエラーメッセージが表示される
      await expect(page.getByText('パスワードを入力してください')).toBeVisible();
    });

    test('無効なメール形式を入力するとバリデーションエラーが表示される', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });

      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'member123');
      await page.click('button[type="submit"]');

      // バリデーションエラーメッセージが表示される
      await expect(page.getByText('有効なメールアドレスを入力してください')).toBeVisible();
    });
  });

  test.describe('E2E-001-03: ログアウト', () => {
    test('ログイン状態でログアウトするとログイン画面に遷移する', async ({ page }) => {
      // 1. ログインしてダッシュボードを表示
      await login(page, 'yamada@example.com', 'member123');

      // ダッシュボードが表示されていることを確認
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();

      // 2. ログアウトを実行
      await logout(page);

      // 3. ログイン画面に遷移することを確認
      await expect(page).toHaveURL('/login');

      // ログイン画面のタイトルが表示されていることを確認
      await expect(
        page.locator('[data-slot="card-title"]').getByText('営業日報システム')
      ).toBeVisible();
    });

    test('ログアウト後にダッシュボードにアクセスするとログイン画面にリダイレクトされる', async ({
      page,
    }) => {
      // ログインしてダッシュボード表示
      await login(page, 'yamada@example.com', 'member123');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();

      // ログアウト
      await logout(page);
      await expect(page).toHaveURL('/login');

      // ダッシュボードに直接アクセスを試みる
      await page.goto('/');

      // ログイン画面にリダイレクトされることを確認
      await page.waitForURL('/login');
      await page.waitForSelector('input[name="email"]', { timeout: 30000 });
      await expect(
        page.locator('[data-slot="card-title"]').getByText('営業日報システム')
      ).toBeVisible();
    });
  });

  test.describe('認証済みユーザーの動作', () => {
    test('ログイン済みでログイン画面にアクセスするとダッシュボードにリダイレクトされる', async ({
      page,
    }) => {
      // ログイン
      await login(page, 'yamada@example.com', 'member123');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();

      // ログイン画面に直接アクセスを試みる
      await page.goto('/login');

      // ダッシュボードにリダイレクトされることを確認
      await page.waitForURL('/');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();
    });
  });
});
