import { expect, test } from '@playwright/test';

import { login, logout } from '../helpers/auth';

/**
 * 営業マスタ E2Eテスト (E2E-030)
 *
 * テスト仕様書のE2E-030に対応するテストシナリオ
 * - E2E-030-01: 営業担当者登録
 * - E2E-030-02: 営業担当者編集
 * - E2E-030-03: 営業担当者無効化
 *
 * テストデータ:
 * - 管理者: admin@example.com / admin123
 * - 上長: manager@example.com / manager123
 * - 一般営業: yamada@example.com / member123
 *
 * 注意:
 * - このテストは管理者権限でログインして実行する
 * - テスト実行前に `npx prisma db push --force-reset && npm run db:seed` を実行してください
 */

// テストのタイムアウトを延長
test.setTimeout(120000);

// テストを直列実行（データの整合性を保つため）
test.describe.configure({ mode: 'serial' });

// テストで使用する一意のタイムスタンプ
const timestamp = Date.now();
const TEST_EMPLOYEE_CODE = `TSTEMP${timestamp.toString().slice(-6)}`;
const TEST_EMAIL = `test-emp-${timestamp}@example.com`;
const UPDATED_NAME = `更新後テスト担当者 ${timestamp}`;

test.describe('営業マスタ機能 (E2E-030)', () => {
  test.beforeEach(async ({ page }) => {
    // 管理者アカウントでログイン
    await login(page, 'admin@example.com', 'admin123');

    // ダッシュボードが表示されるまで待機
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

    // 営業マスタ画面に遷移
    await page.goto('/admin/sales-persons');
    await page.waitForLoadState('networkidle');

    // 営業マスタ画面が表示されるまで待機
    await expect(page.getByRole('heading', { name: '営業マスタ管理' })).toBeVisible({
      timeout: 30000,
    });
  });

  /**
   * E2E-030-01: 営業担当者登録
   *
   * テストシナリオ:
   * 1. 管理者アカウントでログイン
   * 2. 新規登録ボタンクリック
   * 3. 各項目入力
   * 4. 保存ボタンクリック
   * 5. 期待結果: 一覧に追加される
   */
  test('E2E-030-01: 新規登録ボタンから営業担当者を登録し、一覧に追加される', async ({ page }) => {
    // 1. 新規登録ボタンをクリック
    const createButton = page.getByRole('button', { name: '新規登録' });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // 登録モーダルが表示されるまで待機
    await expect(page.getByRole('heading', { name: '営業担当者 登録' })).toBeVisible({
      timeout: 10000,
    });

    // 2. 各項目を入力
    // 社員番号
    await page.fill('input[name="employeeCode"]', TEST_EMPLOYEE_CODE);

    // 氏名
    await page.fill('input[name="name"]', `テスト担当者 ${timestamp}`);

    // メールアドレス
    await page.fill('input[name="email"]', TEST_EMAIL);

    // パスワード
    await page.fill('input[name="password"]', 'testpassword123');

    // 役職を選択（一般）- デフォルトで「一般」が選択されている
    // 役職のcomboboxをクリック
    const roleCombobox = page.getByRole('combobox', { name: '役職' });
    await expect(roleCombobox).toBeVisible({ timeout: 5000 });
    await roleCombobox.click();
    // ドロップダウンが開くのを待つ
    await page.waitForSelector('[data-slot="select-content"]', { state: 'visible', timeout: 5000 });
    // 「一般」を選択
    await page.locator('[data-slot="select-item"]').filter({ hasText: '一般' }).click();

    // 状態は有効のまま（デフォルト）

    // 3. 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: '保存' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // モーダルが閉じるのを待機
    await expect(page.getByRole('heading', { name: '営業担当者 登録' })).not.toBeVisible({
      timeout: 10000,
    });

    // 成功トーストが表示されることを確認
    await expect(page.locator('text=営業担当者を登録しました')).toBeVisible({ timeout: 10000 });

    // 4. 一覧に追加されていることを確認
    await expect(page.getByRole('cell', { name: TEST_EMPLOYEE_CODE, exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole('cell', { name: `テスト担当者 ${timestamp}`, exact: true })
    ).toBeVisible();
  });

  /**
   * E2E-030-02: 営業担当者編集
   *
   * テストシナリオ:
   * 1. 編集ボタンクリック
   * 2. 内容修正
   * 3. 保存
   * 4. 期待結果: 変更が反映される
   *
   * 注意: E2E-030-01で作成した担当者を編集する
   */
  test('E2E-030-02: 編集ボタンから営業担当者を編集し、変更が反映される', async ({ page }) => {
    // E2E-030-01で作成した担当者の行を探す
    const targetRow = page.locator('tr', { hasText: TEST_EMPLOYEE_CODE });
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    // 1. 編集ボタンをクリック
    const editButton = targetRow.locator(`button[aria-label="テスト担当者 ${timestamp}を編集"]`);
    await expect(editButton).toBeVisible();
    await editButton.click();

    // 編集モーダルが表示されるまで待機
    await expect(page.getByRole('heading', { name: '営業担当者 編集' })).toBeVisible({
      timeout: 10000,
    });

    // 社員番号は編集不可であることを確認
    const employeeCodeInput = page.locator('input[name="employeeCode"]');
    await expect(employeeCodeInput).toBeDisabled();

    // 2. 氏名を修正
    const nameInput = page.locator('input[name="name"]');
    await nameInput.clear();
    await nameInput.fill(UPDATED_NAME);

    // 役職を上長に変更
    const roleCombobox = page.getByRole('combobox', { name: '役職' });
    await expect(roleCombobox).toBeVisible({ timeout: 5000 });
    await roleCombobox.click();
    await page.waitForSelector('[data-slot="select-content"]', { state: 'visible', timeout: 5000 });
    await page.locator('[data-slot="select-item"]').filter({ hasText: '上長' }).click();

    // 3. 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: '保存' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // モーダルが閉じるのを待機
    await expect(page.getByRole('heading', { name: '営業担当者 編集' })).not.toBeVisible({
      timeout: 10000,
    });

    // 成功トーストが表示されることを確認
    await expect(page.locator('text=営業担当者を更新しました')).toBeVisible({ timeout: 10000 });

    // 4. 変更が反映されていることを確認
    await expect(page.getByRole('cell', { name: UPDATED_NAME, exact: true })).toBeVisible({
      timeout: 10000,
    });

    // 役職が「上長」になっていることを確認
    const updatedRow = page.locator('tr', { hasText: TEST_EMPLOYEE_CODE });
    await expect(updatedRow.locator('text=上長')).toBeVisible();
  });

  /**
   * E2E-030-03: 営業担当者無効化
   *
   * テストシナリオ:
   * 1. 編集で状態を無効に変更
   * 2. 保存
   * 3. 期待結果: 状態が「無効」に変更
   *
   * 注意: E2E-030-01で作成した担当者を無効化する
   */
  test('E2E-030-03: 編集で状態を無効に変更すると、状態が「無効」に変更される', async ({ page }) => {
    // E2E-030-01で作成した担当者の行を探す
    const targetRow = page.locator('tr', { hasText: TEST_EMPLOYEE_CODE });
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    // 1. 編集ボタンをクリック
    const editButton = targetRow.locator(`button[aria-label="${UPDATED_NAME}を編集"]`);
    await expect(editButton).toBeVisible();
    await editButton.click();

    // 編集モーダルが表示されるまで待機
    await expect(page.getByRole('heading', { name: '営業担当者 編集' })).toBeVisible({
      timeout: 10000,
    });

    // 2. 状態を無効に変更（ラジオボタンをクリック）
    await page.click('label:has-text("無効")');

    // 3. 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: '保存' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // モーダルが閉じるのを待機
    await expect(page.getByRole('heading', { name: '営業担当者 編集' })).not.toBeVisible({
      timeout: 10000,
    });

    // 成功トーストが表示されることを確認
    await expect(page.locator('text=営業担当者を更新しました')).toBeVisible({ timeout: 10000 });

    // 4. 状態が「無効」に変更されていることを確認
    const updatedRow = page.locator('tr', { hasText: TEST_EMPLOYEE_CODE });
    await expect(updatedRow).toBeVisible({ timeout: 10000 });

    // 無効バッジが表示されていることを確認
    const inactiveBadge = updatedRow.locator('span:has-text("無効")');
    await expect(inactiveBadge).toBeVisible();
  });

  test.describe('権限チェック', () => {
    test('一般営業は営業マスタ画面にアクセスできない', async ({ page }) => {
      // ダッシュボードに戻ってからログアウト（ヘッダーを確実に表示させる）
      await page.goto('/');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

      // ログアウト
      await logout(page);

      // 一般営業でログイン
      await login(page, 'yamada@example.com', 'member123');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

      // 営業マスタ画面に直接アクセス
      await page.goto('/admin/sales-persons');

      // ダッシュボードにリダイレクトされることを確認
      await page.waitForURL('/', { timeout: 30000 });
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();
    });

    test('上長は営業マスタ画面にアクセスできない', async ({ page }) => {
      // ダッシュボードに戻ってからログアウト（ヘッダーを確実に表示させる）
      await page.goto('/');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

      // ログアウト
      await logout(page);

      // 上長でログイン
      await login(page, 'manager@example.com', 'manager123');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

      // 営業マスタ画面に直接アクセス
      await page.goto('/admin/sales-persons');

      // ダッシュボードにリダイレクトされることを確認
      await page.waitForURL('/', { timeout: 30000 });
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();
    });
  });

  test.describe('バリデーション', () => {
    test('必須項目が未入力の場合、エラーメッセージが表示される', async ({ page }) => {
      // 新規登録ボタンをクリック
      const createButton = page.getByRole('button', { name: '新規登録' });
      await createButton.click();

      // 登録モーダルが表示されるまで待機
      await expect(page.getByRole('heading', { name: '営業担当者 登録' })).toBeVisible({
        timeout: 10000,
      });

      // 何も入力せずに保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: '保存' });
      await saveButton.click();

      // バリデーションエラーが表示されることを確認
      await expect(page.locator('text=社員番号を入力してください')).toBeVisible();
      await expect(page.locator('text=氏名を入力してください')).toBeVisible();
      await expect(page.locator('text=メールアドレスを入力してください')).toBeVisible();
      await expect(page.locator('text=パスワードは8文字以上で入力してください')).toBeVisible();
    });

    test('社員番号が半角英数字以外の場合、エラーメッセージが表示される', async ({ page }) => {
      // 新規登録ボタンをクリック
      const createButton = page.getByRole('button', { name: '新規登録' });
      await createButton.click();

      // 登録モーダルが表示されるまで待機
      await expect(page.getByRole('heading', { name: '営業担当者 登録' })).toBeVisible({
        timeout: 10000,
      });

      // 社員番号に日本語を入力
      await page.fill('input[name="employeeCode"]', 'あいうえお');

      // 他の必須項目を入力
      await page.fill('input[name="name"]', 'テスト');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: '保存' });
      await saveButton.click();

      // バリデーションエラーが表示されることを確認
      await expect(page.locator('text=社員番号は半角英数字で入力してください')).toBeVisible();
    });

    test('パスワードが8文字未満の場合、エラーメッセージが表示される', async ({ page }) => {
      // 新規登録ボタンをクリック
      const createButton = page.getByRole('button', { name: '新規登録' });
      await createButton.click();

      // 登録モーダルが表示されるまで待機
      await expect(page.getByRole('heading', { name: '営業担当者 登録' })).toBeVisible({
        timeout: 10000,
      });

      // 社員番号・氏名・メールを入力
      await page.fill('input[name="employeeCode"]', 'EMP999');
      await page.fill('input[name="name"]', 'テスト');
      await page.fill('input[name="email"]', 'emp999@example.com');

      // 7文字のパスワードを入力
      await page.fill('input[name="password"]', 'short12');

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: '保存' });
      await saveButton.click();

      // バリデーションエラーが表示されることを確認
      await expect(page.locator('text=パスワードは8文字以上で入力してください')).toBeVisible();
    });
  });

  test.describe('削除機能', () => {
    test('削除ボタンをクリックすると確認ダイアログが表示され、削除を実行できる', async ({
      page,
    }) => {
      // シードデータの山田太郎の行を探す（削除しても無効化されるだけ）
      // 注意: 本テストでは E2E-030-03 で既に無効化された担当者は削除ボタンが無効なため
      // シードデータの有効な担当者（例: 鈴木花子）を対象にする
      const targetRow = page.locator('tr', { hasText: '鈴木 花子' });
      await expect(targetRow).toBeVisible({ timeout: 10000 });

      // 削除ボタンをクリック
      const deleteButton = targetRow.locator('button[aria-label="鈴木 花子を削除"]');
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      // 確認ダイアログが表示されることを確認
      await expect(page.getByRole('heading', { name: '営業担当者の削除' })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('text=「鈴木 花子」を削除しますか')).toBeVisible();

      // キャンセルボタンをクリック
      const cancelButton = page.getByRole('button', { name: 'キャンセル' });
      await cancelButton.click();

      // ダイアログが閉じることを確認
      await expect(page.getByRole('heading', { name: '営業担当者の削除' })).not.toBeVisible({
        timeout: 10000,
      });

      // 担当者がまだ一覧に存在することを確認
      await expect(targetRow).toBeVisible();
    });
  });
});
