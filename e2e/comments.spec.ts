import { expect, test } from '@playwright/test';

import { login } from './helpers/auth';

// テストのタイムアウトを延長
test.setTimeout(60000);

// テストを直列実行（データの整合性を保つため）
test.describe.configure({ mode: 'serial' });

test.describe('コメント機能 (E2E-020)', () => {
  /**
   * E2E-020-01: コメント投稿（上長）
   *
   * テストシナリオ:
   * 1. 上長アカウントでログイン
   * 2. 部下の日報詳細表示
   * 3. コメント入力
   * 4. 投稿ボタンクリック
   * 5. 期待結果: コメントが追加される
   */
  test('E2E-020-01: 上長が部下の日報にコメントを投稿できる', async ({ page }) => {
    // 1. 上長アカウント（佐藤課長）でログイン
    await login(page, 'manager@example.com', 'manager123');

    // ダッシュボードが表示されるまで待機
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 10000 });

    // 2. 部下の日報詳細を表示
    // シードデータでは山田太郎の日報が存在する
    const detailLink = page.locator('a:has-text("詳細")').first();
    await expect(detailLink).toBeVisible({ timeout: 10000 });
    await detailLink.click();

    // 日報詳細画面に遷移
    await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // 日報詳細が表示されていることを確認（見出しを使用）
    await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible({ timeout: 10000 });

    // ページの下部までスクロールしてコメントセクションを表示
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // コメントセクションが表示されていることを確認（CardTitleはdiv要素）
    const commentHeader = page.locator('[data-slot="card-title"]:has-text("コメント（")');
    await expect(commentHeader).toBeVisible({ timeout: 10000 });

    // 現在のコメント数を取得
    const commentHeaderText = await commentHeader.textContent();
    const currentCommentCountMatch = commentHeaderText?.match(/コメント（(\d+)件）/);
    const currentCommentCount = currentCommentCountMatch
      ? parseInt(currentCommentCountMatch[1], 10)
      : 0;

    // 3. コメント入力
    // 上長・管理者にはコメント投稿フォームが表示される
    const commentFormTitle = page.locator('[data-slot="card-title"]:has-text("コメントを投稿")');
    await expect(commentFormTitle).toBeVisible({ timeout: 10000 });

    const commentTextarea = page.locator('textarea[aria-label="コメント内容"]');
    await expect(commentTextarea).toBeVisible({ timeout: 5000 });

    const testComment = `E2Eテストからのコメント投稿 - ${new Date().toISOString()}`;
    await commentTextarea.fill(testComment);

    // 4. 投稿ボタンクリック
    const submitButton = page.locator('button:has-text("コメント投稿")');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // 投稿処理の完了を待機
    await page.waitForLoadState('networkidle');

    // 5. 期待結果: コメントが追加される
    // 投稿したコメントが表示されていることを確認（これが表示待機の役割も果たす）
    await expect(page.locator(`text=${testComment}`)).toBeVisible({ timeout: 10000 });

    // コメント数が増加していることを確認
    const updatedCommentHeaderText = await commentHeader.textContent();
    const updatedCommentCountMatch = updatedCommentHeaderText?.match(/コメント（(\d+)件）/);
    const updatedCommentCount = updatedCommentCountMatch
      ? parseInt(updatedCommentCountMatch[1], 10)
      : 0;
    expect(updatedCommentCount).toBe(currentCommentCount + 1);

    // コメント入力欄がクリアされていることを確認
    await expect(commentTextarea).toHaveValue('');
  });

  /**
   * E2E-020-02: コメント削除
   *
   * テストシナリオ:
   * 1. 自分のコメントの削除ボタンクリック
   * 2. 確認ダイアログでOK
   * 3. 期待結果: コメントが削除される
   *
   * 注意: このテストはE2E-020-01で投稿したコメントを削除する
   */
  test('E2E-020-02: 投稿者が自分のコメントを削除できる', async ({ page }) => {
    // 上長アカウント（佐藤課長）でログイン
    await login(page, 'manager@example.com', 'manager123');

    // ダッシュボードが表示されるまで待機
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 10000 });

    // 部下の日報詳細を表示
    const detailLink = page.locator('a:has-text("詳細")').first();
    await expect(detailLink).toBeVisible({ timeout: 10000 });
    await detailLink.click();

    // 日報詳細画面に遷移
    await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // 日報詳細が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible({ timeout: 10000 });

    // ページの下部までスクロールしてコメントセクションを表示
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // コメントセクションが表示されていることを確認
    const commentHeader = page.locator('[data-slot="card-title"]:has-text("コメント（")');
    await expect(commentHeader).toBeVisible({ timeout: 10000 });

    // 現在のコメント数を取得
    const commentHeaderText = await commentHeader.textContent();
    const currentCommentCountMatch = commentHeaderText?.match(/コメント（(\d+)件）/);
    const currentCommentCount = currentCommentCountMatch
      ? parseInt(currentCommentCountMatch[1], 10)
      : 0;

    // コメントが1件以上あることを確認
    expect(currentCommentCount).toBeGreaterThan(0);

    // 1. 自分のコメントの削除ボタンをクリック
    // 佐藤課長が投稿したコメントには削除ボタンが表示される
    const deleteButton = page.locator('button[aria-label="コメントを削除"]').first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
    await deleteButton.click();

    // 2. 確認ダイアログが表示される
    await expect(page.getByRole('heading', { name: 'コメントを削除' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=このコメントを削除してもよろしいですか')).toBeVisible();

    // 確認ダイアログで削除ボタンをクリック
    const confirmDeleteButton = page.getByRole('button', { name: '削除' });
    await confirmDeleteButton.click();

    // 削除処理の完了を待機
    await page.waitForLoadState('networkidle');

    // 確認ダイアログが閉じるのを待機（これがUI更新の確認になる）
    await expect(page.getByRole('heading', { name: 'コメントを削除' })).not.toBeVisible({
      timeout: 10000,
    });

    // 3. 期待結果: コメントが削除される
    // コメント数が減少していることを確認
    const updatedCommentHeaderText = await commentHeader.textContent();
    const updatedCommentCountMatch = updatedCommentHeaderText?.match(/コメント（(\d+)件）/);
    const updatedCommentCount = updatedCommentCountMatch
      ? parseInt(updatedCommentCountMatch[1], 10)
      : 0;
    expect(updatedCommentCount).toBe(currentCommentCount - 1);
  });

  test.describe('コメント投稿のバリデーション', () => {
    test('空のコメントは投稿できない', async ({ page }) => {
      // 上長アカウントでログイン
      await login(page, 'manager@example.com', 'manager123');

      // ダッシュボードが表示されるまで待機
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 10000 });

      // 部下の日報詳細を表示
      const detailLink = page.locator('a:has-text("詳細")').first();
      await expect(detailLink).toBeVisible({ timeout: 10000 });
      await detailLink.click();

      // 日報詳細画面に遷移
      await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // ページの下部までスクロール
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // コメント入力欄が空の状態で投稿ボタンが無効になっていることを確認
      const submitButton = page.locator('button:has-text("コメント投稿")');
      await expect(submitButton).toBeDisabled();

      // 空白のみを入力
      const commentTextarea = page.locator('textarea[aria-label="コメント内容"]');
      await commentTextarea.fill('   ');

      // 投稿ボタンが無効のままであることを確認
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('コメント権限の確認', () => {
    test('一般営業はコメント投稿フォームが表示されない', async ({ page }) => {
      // 一般営業アカウント（山田太郎）でログイン
      await login(page, 'yamada@example.com', 'member123');

      // ダッシュボードが表示されるまで待機
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 10000 });

      // 自分の日報詳細を表示
      const detailLink = page.locator('a:has-text("詳細")').first();
      await expect(detailLink).toBeVisible({ timeout: 10000 });
      await detailLink.click();

      // 日報詳細画面に遷移
      await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // 日報詳細が表示されていることを確認
      await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible({ timeout: 10000 });

      // ページの下部までスクロール
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // コメント一覧は表示される
      const commentHeader = page.locator('[data-slot="card-title"]:has-text("コメント（")');
      await expect(commentHeader).toBeVisible({ timeout: 10000 });

      // 一般営業にはコメント投稿フォームが表示されない
      const commentFormTitle = page.locator('[data-slot="card-title"]:has-text("コメントを投稿")');
      await expect(commentFormTitle).not.toBeVisible();
    });

    test('他人のコメントには削除ボタンが表示されない', async ({ page }) => {
      // 一般営業アカウント（山田太郎）でログイン
      await login(page, 'yamada@example.com', 'member123');

      // ダッシュボードが表示されるまで待機
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 10000 });

      // 自分の日報詳細を表示
      const detailLink = page.locator('a:has-text("詳細")').first();
      await expect(detailLink).toBeVisible({ timeout: 10000 });
      await detailLink.click();

      // 日報詳細画面に遷移
      await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // 日報詳細が表示されていることを確認
      await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible({ timeout: 10000 });

      // ページの下部までスクロール
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // コメントセクションが表示されていることを確認
      const commentHeader = page.locator('[data-slot="card-title"]:has-text("コメント（")');
      await expect(commentHeader).toBeVisible({ timeout: 10000 });

      // 上長が投稿したコメントには、一般営業には削除ボタンが表示されない
      // （シードデータで佐藤課長がコメントを投稿している）
      await expect(page.locator('button[aria-label="コメントを削除"]')).not.toBeVisible();
    });
  });

  test.describe('コメント削除のキャンセル', () => {
    /**
     * このテストはE2E-020-01で投稿したコメントがある前提で実行される。
     * 直列実行のため、前のテストでコメントが投稿されている。
     */
    test('削除確認ダイアログでキャンセルするとコメントは削除されない', async ({ page }) => {
      // 上長アカウント（佐藤課長）でログイン
      await login(page, 'manager@example.com', 'manager123');

      // ダッシュボードが表示されるまで待機
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 10000 });

      // 部下の日報詳細を表示
      const detailLink = page.locator('a:has-text("詳細")').first();
      await expect(detailLink).toBeVisible({ timeout: 10000 });
      await detailLink.click();

      // 日報詳細画面に遷移
      await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });
      await page.waitForLoadState('networkidle');

      // ページの下部までスクロール
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // コメントセクションが表示されるまで待機
      const commentHeader = page.locator('[data-slot="card-title"]:has-text("コメント（")');
      await expect(commentHeader).toBeVisible({ timeout: 10000 });

      // コメント数を取得
      const commentHeaderText = await commentHeader.textContent();
      const currentCommentCountMatch = commentHeaderText?.match(/コメント（(\d+)件）/);
      const currentCommentCount = currentCommentCountMatch
        ? parseInt(currentCommentCountMatch[1], 10)
        : 0;

      // 削除ボタンが表示されていることを確認（前提条件）
      const deleteButton = page.locator('button[aria-label="コメントを削除"]').first();
      await expect(deleteButton).toBeVisible({ timeout: 5000 });

      // 削除ボタンをクリック
      await deleteButton.click();

      // 確認ダイアログが表示される
      await expect(page.getByRole('heading', { name: 'コメントを削除' })).toBeVisible({
        timeout: 5000,
      });

      // キャンセルボタンをクリック
      const cancelButton = page.getByRole('button', { name: 'キャンセル' });
      await cancelButton.click();

      // ダイアログが閉じる
      await expect(page.getByRole('heading', { name: 'コメントを削除' })).not.toBeVisible();

      // コメント数が変わっていないことを確認
      const updatedCommentHeaderText = await commentHeader.textContent();
      const updatedCommentCountMatch = updatedCommentHeaderText?.match(/コメント（(\d+)件）/);
      const updatedCommentCount = updatedCommentCountMatch
        ? parseInt(updatedCommentCountMatch[1], 10)
        : 0;
      expect(updatedCommentCount).toBe(currentCommentCount);
    });
  });
});
