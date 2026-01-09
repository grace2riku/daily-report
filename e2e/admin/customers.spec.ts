import { expect, test } from '@playwright/test';

import { login, logout } from '../helpers/auth';

/**
 * 顧客マスタ E2Eテスト (E2E-031)
 *
 * テスト仕様書のE2E-031に対応するテストシナリオ
 * - E2E-031-01: 顧客登録
 * - E2E-031-02: 顧客検索
 *
 * テストデータ:
 * - 管理者: admin@example.com / admin123
 * - 上長: manager@example.com / manager123
 * - 一般営業: yamada@example.com / member123
 * - シードデータの顧客:
 *   - 株式会社ABC (C001)
 *   - DEF株式会社 (C002)
 *   - GHI工業 (C003)
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
const TEST_CUSTOMER_CODE = `TSTC${timestamp.toString().slice(-6)}`;
const TEST_CUSTOMER_NAME = `テスト顧客株式会社 ${timestamp}`;
const UPDATED_CUSTOMER_NAME = `更新後テスト顧客株式会社 ${timestamp}`;

test.describe('顧客マスタ機能 (E2E-031)', () => {
  test.beforeEach(async ({ page }) => {
    // 管理者アカウントでログイン
    await login(page, 'admin@example.com', 'admin123');

    // ダッシュボードが表示されるまで待機
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

    // 顧客マスタ画面に遷移
    await page.goto('/admin/customers');
    await page.waitForLoadState('networkidle');

    // 顧客マスタ画面が表示されるまで待機
    await expect(page.getByRole('heading', { name: '顧客マスタ管理' })).toBeVisible({
      timeout: 30000,
    });
  });

  /**
   * E2E-031-01: 顧客登録
   *
   * テストシナリオ:
   * 1. 新規登録ボタンクリック
   * 2. 各項目入力
   * 3. 保存
   * 4. 期待結果: 一覧に追加される
   */
  test('E2E-031-01: 新規登録ボタンから顧客を登録し、一覧に追加される', async ({ page }) => {
    // 1. 新規登録ボタンをクリック
    const createButton = page.getByRole('button', { name: '新規登録' });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // 登録モーダルが表示されるまで待機
    await expect(page.getByRole('heading', { name: '顧客 登録' })).toBeVisible({ timeout: 10000 });

    // 2. 各項目を入力
    // 顧客コード
    await page.fill('input[name="customerCode"]', TEST_CUSTOMER_CODE);

    // 顧客名
    await page.fill('input[name="name"]', TEST_CUSTOMER_NAME);

    // 住所
    await page.fill('textarea[name="address"]', '東京都渋谷区テスト町1-2-3');

    // 電話番号
    await page.fill('input[name="phone"]', '03-1111-2222');

    // 状態は有効のまま（デフォルト）

    // 3. 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: '保存' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // モーダルが閉じるのを待機
    await expect(page.getByRole('heading', { name: '顧客 登録' })).not.toBeVisible({
      timeout: 10000,
    });

    // 成功トーストが表示されることを確認
    await expect(page.locator('text=顧客を登録しました')).toBeVisible({ timeout: 10000 });

    // 4. 一覧に追加されていることを確認
    await expect(page.getByRole('cell', { name: TEST_CUSTOMER_CODE, exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('cell', { name: TEST_CUSTOMER_NAME, exact: true })).toBeVisible();
  });

  /**
   * E2E-031-02: 顧客検索
   *
   * テストシナリオ:
   * 1. 検索ボックスに顧客名入力
   * 2. 検索ボタンクリック
   * 3. 期待結果: 該当顧客のみ表示
   */
  test('E2E-031-02: 検索ボックスで顧客名を検索すると、該当顧客のみ表示される', async ({ page }) => {
    // 1. 検索ボックスに顧客名を入力
    const searchInput = page.getByRole('searchbox', { name: '検索' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('株式会社ABC');

    // 2. 検索ボタンをクリック（検索ボックスの隣にある検索ボタン）
    // 検索セクションを検索ボックスを含む親要素で特定
    const searchSection = page.locator('div').filter({ has: searchInput }).first();
    const searchButton = searchSection.getByRole('button', { name: '検索', exact: true });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // 検索結果が読み込まれるのを待機
    await page.waitForLoadState('networkidle');

    // 3. 該当顧客のみ表示されることを確認
    await expect(page.getByRole('cell', { name: '株式会社ABC', exact: true })).toBeVisible({
      timeout: 10000,
    });

    // 他の顧客が表示されていないことを確認
    await expect(page.getByRole('cell', { name: 'DEF株式会社', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'GHI工業', exact: true })).not.toBeVisible();
  });

  test('E2E-031-02: 検索ボックスで顧客コードを検索すると、該当顧客のみ表示される', async ({
    page,
  }) => {
    // 検索ボックスに顧客コードを入力
    const searchInput = page.getByRole('searchbox', { name: '検索' });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('C002');

    // 検索ボタンをクリック（検索ボックスの隣にある検索ボタン）
    const searchSection = page.locator('div').filter({ has: searchInput }).first();
    const searchButton = searchSection.getByRole('button', { name: '検索', exact: true });
    await expect(searchButton).toBeVisible();
    await searchButton.click();

    // 検索結果が読み込まれるのを待機
    await page.waitForLoadState('networkidle');

    // 該当顧客のみ表示されることを確認
    await expect(page.getByRole('cell', { name: 'DEF株式会社', exact: true })).toBeVisible({
      timeout: 10000,
    });

    // 他の顧客が表示されていないことを確認
    await expect(page.getByRole('cell', { name: '株式会社ABC', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'GHI工業', exact: true })).not.toBeVisible();
  });

  test.describe('顧客編集', () => {
    test('編集ボタンから顧客を編集し、変更が反映される', async ({ page }) => {
      // E2E-031-01で作成した顧客の行を探す
      const targetRow = page.locator('tr', { hasText: TEST_CUSTOMER_CODE });
      await expect(targetRow).toBeVisible({ timeout: 10000 });

      // 編集ボタンをクリック
      const editButton = targetRow.locator(`button[aria-label="${TEST_CUSTOMER_NAME}を編集"]`);
      await expect(editButton).toBeVisible();
      await editButton.click();

      // 編集モーダルが表示されるまで待機
      await expect(page.getByRole('heading', { name: '顧客 編集' })).toBeVisible({
        timeout: 10000,
      });

      // 顧客コードは編集不可であることを確認
      const customerCodeInput = page.locator('input[name="customerCode"]');
      await expect(customerCodeInput).toBeDisabled();

      // 顧客名を修正
      const nameInput = page.locator('input[name="name"]');
      await nameInput.clear();
      await nameInput.fill(UPDATED_CUSTOMER_NAME);

      // 住所を修正
      const addressInput = page.locator('textarea[name="address"]');
      await addressInput.clear();
      await addressInput.fill('東京都新宿区更新町4-5-6');

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: '保存' });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // モーダルが閉じるのを待機
      await expect(page.getByRole('heading', { name: '顧客 編集' })).not.toBeVisible({
        timeout: 10000,
      });

      // 成功トーストが表示されることを確認
      await expect(page.locator('text=顧客を更新しました')).toBeVisible({ timeout: 10000 });

      // 変更が反映されていることを確認
      await expect(
        page.getByRole('cell', { name: UPDATED_CUSTOMER_NAME, exact: true })
      ).toBeVisible({
        timeout: 10000,
      });
    });

    test('編集で状態を無効に変更すると、状態が「無効」に変更される', async ({ page }) => {
      // E2E-031-01で作成した顧客の行を探す
      const targetRow = page.locator('tr', { hasText: TEST_CUSTOMER_CODE });
      await expect(targetRow).toBeVisible({ timeout: 10000 });

      // 編集ボタンをクリック
      const editButton = targetRow.locator(`button[aria-label="${UPDATED_CUSTOMER_NAME}を編集"]`);
      await expect(editButton).toBeVisible();
      await editButton.click();

      // 編集モーダルが表示されるまで待機
      await expect(page.getByRole('heading', { name: '顧客 編集' })).toBeVisible({
        timeout: 10000,
      });

      // 状態を無効に変更
      await page.click('label:has-text("無効")');

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: '保存' });
      await expect(saveButton).toBeEnabled();
      await saveButton.click();

      // モーダルが閉じるのを待機
      await expect(page.getByRole('heading', { name: '顧客 編集' })).not.toBeVisible({
        timeout: 10000,
      });

      // 成功トーストが表示されることを確認
      await expect(page.locator('text=顧客を更新しました')).toBeVisible({ timeout: 10000 });

      // 状態が「無効」に変更されていることを確認
      const updatedRow = page.locator('tr', { hasText: TEST_CUSTOMER_CODE });
      await expect(updatedRow).toBeVisible({ timeout: 10000 });

      // 無効バッジが表示されていることを確認
      const inactiveBadge = updatedRow.locator('span:has-text("無効")');
      await expect(inactiveBadge).toBeVisible();
    });
  });

  test.describe('権限チェック', () => {
    test('一般営業は顧客マスタ画面にアクセスできない', async ({ page }) => {
      // ダッシュボードに戻ってからログアウト（ヘッダーを確実に表示させる）
      await page.goto('/');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

      // ログアウト
      await logout(page);

      // 一般営業でログイン
      await login(page, 'yamada@example.com', 'member123');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

      // 顧客マスタ画面に直接アクセス
      await page.goto('/admin/customers');

      // ダッシュボードにリダイレクトされることを確認
      await page.waitForURL('/', { timeout: 30000 });
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();
    });

    test('上長は顧客マスタ画面にアクセスできない', async ({ page }) => {
      // ダッシュボードに戻ってからログアウト（ヘッダーを確実に表示させる）
      await page.goto('/');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

      // ログアウト
      await logout(page);

      // 上長でログイン
      await login(page, 'manager@example.com', 'manager123');
      await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 30000 });

      // 顧客マスタ画面に直接アクセス
      await page.goto('/admin/customers');

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
      await expect(page.getByRole('heading', { name: '顧客 登録' })).toBeVisible({
        timeout: 10000,
      });

      // 何も入力せずに保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: '保存' });
      await saveButton.click();

      // バリデーションエラーが表示されることを確認
      await expect(page.locator('text=顧客コードを入力してください')).toBeVisible();
      await expect(page.locator('text=顧客名を入力してください')).toBeVisible();
    });

    test('顧客コードが半角英数字以外の場合、エラーメッセージが表示される', async ({ page }) => {
      // 新規登録ボタンをクリック
      const createButton = page.getByRole('button', { name: '新規登録' });
      await createButton.click();

      // 登録モーダルが表示されるまで待機
      await expect(page.getByRole('heading', { name: '顧客 登録' })).toBeVisible({
        timeout: 10000,
      });

      // 顧客コードに日本語を入力
      await page.fill('input[name="customerCode"]', 'あいうえお');

      // 顧客名を入力
      await page.fill('input[name="name"]', 'テスト顧客');

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: '保存' });
      await saveButton.click();

      // バリデーションエラーが表示されることを確認
      await expect(page.locator('text=顧客コードは半角英数字で入力してください')).toBeVisible();
    });

    test('電話番号の形式が不正な場合、エラーメッセージが表示される', async ({ page }) => {
      // 新規登録ボタンをクリック
      const createButton = page.getByRole('button', { name: '新規登録' });
      await createButton.click();

      // 登録モーダルが表示されるまで待機
      await expect(page.getByRole('heading', { name: '顧客 登録' })).toBeVisible({
        timeout: 10000,
      });

      // 顧客コード・顧客名を入力
      await page.fill('input[name="customerCode"]', 'C999');
      await page.fill('input[name="name"]', 'テスト顧客');

      // 不正な電話番号を入力
      await page.fill('input[name="phone"]', 'invalid-phone');

      // 保存ボタンをクリック
      const saveButton = page.getByRole('button', { name: '保存' });
      await saveButton.click();

      // バリデーションエラーが表示されることを確認
      await expect(page.locator('text=電話番号の形式が正しくありません')).toBeVisible();
    });
  });

  test.describe('削除機能', () => {
    test('削除ボタンをクリックすると確認ダイアログが表示され、キャンセルで閉じる', async ({
      page,
    }) => {
      // シードデータの顧客の行を探す
      const targetRow = page.locator('tr', { hasText: '株式会社ABC' });
      await expect(targetRow).toBeVisible({ timeout: 10000 });

      // 削除ボタンをクリック
      const deleteButton = targetRow.locator('button[aria-label="株式会社ABCを削除"]');
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      // 確認ダイアログが表示されることを確認
      await expect(page.getByRole('heading', { name: '顧客の削除' })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('text=「株式会社ABC」を削除しますか')).toBeVisible();

      // キャンセルボタンをクリック
      const cancelButton = page.getByRole('button', { name: 'キャンセル' });
      await cancelButton.click();

      // ダイアログが閉じることを確認
      await expect(page.getByRole('heading', { name: '顧客の削除' })).not.toBeVisible({
        timeout: 10000,
      });

      // 顧客がまだ一覧に存在することを確認
      await expect(targetRow).toBeVisible();
    });

    test('削除ボタンをクリックして削除を実行すると、顧客が論理削除される', async ({ page }) => {
      // このテスト専用の顧客を作成（他のテストに影響を与えないため）
      const deleteTimestamp = Date.now();
      const DELETE_CUSTOMER_CODE = `DELC${deleteTimestamp.toString().slice(-6)}`;
      const DELETE_CUSTOMER_NAME = `削除テスト顧客株式会社 ${deleteTimestamp}`;

      // 新規登録ボタンをクリック
      const createButton = page.getByRole('button', { name: '新規登録' });
      await createButton.click();
      await expect(page.getByRole('heading', { name: '顧客 登録' })).toBeVisible({
        timeout: 10000,
      });

      // 各項目を入力
      await page.fill('input[name="customerCode"]', DELETE_CUSTOMER_CODE);
      await page.fill('input[name="name"]', DELETE_CUSTOMER_NAME);
      await page.fill('textarea[name="address"]', '東京都削除区テスト町1-2-3');
      await page.fill('input[name="phone"]', '03-9999-9999');

      const saveButton = page.getByRole('button', { name: '保存' });
      await saveButton.click();

      await expect(page.getByRole('heading', { name: '顧客 登録' })).not.toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('text=顧客を登録しました')).toBeVisible({ timeout: 10000 });

      // 作成した顧客の行を探す
      const targetRow = page.locator('tr', { hasText: DELETE_CUSTOMER_CODE });
      await expect(targetRow).toBeVisible({ timeout: 10000 });

      // 削除ボタンをクリック
      const deleteButton = targetRow.locator(`button[aria-label="${DELETE_CUSTOMER_NAME}を削除"]`);
      await expect(deleteButton).toBeVisible();
      await expect(deleteButton).toBeEnabled();
      await deleteButton.click();

      // 確認ダイアログが表示されることを確認
      await expect(page.getByRole('heading', { name: '顧客の削除' })).toBeVisible({
        timeout: 10000,
      });

      // 削除ボタンをクリック
      const confirmDeleteButton = page.getByRole('button', { name: '削除' });
      await confirmDeleteButton.click();

      // ダイアログが閉じることを確認
      await expect(page.getByRole('heading', { name: '顧客の削除' })).not.toBeVisible({
        timeout: 10000,
      });

      // 成功トーストが表示されることを確認
      await expect(page.locator('text=顧客を削除しました')).toBeVisible({ timeout: 10000 });

      // ページをリロードして最新のデータを取得
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 論理削除なのでレコードは残っているが、状態が「無効」に変更されていることを確認
      const deletedRow = page.locator('tr', { hasText: DELETE_CUSTOMER_CODE });
      await expect(deletedRow).toBeVisible({ timeout: 10000 });

      // 無効バッジが表示されていることを確認
      const inactiveBadge = deletedRow.locator('span:has-text("無効")');
      await expect(inactiveBadge).toBeVisible();

      // 削除ボタンが無効化されていることを確認
      const deleteButtonAfter = deletedRow.locator(
        `button[aria-label="${DELETE_CUSTOMER_NAME}を削除"]`
      );
      await expect(deleteButtonAfter).toBeDisabled();
    });
  });

  test.describe('検索のクリア', () => {
    test('検索後に検索ボックスをクリアして検索すると全件表示される', async ({ page }) => {
      // まず検索を行う
      const searchInput = page.getByRole('searchbox', { name: '検索' });
      await searchInput.fill('株式会社ABC');

      const searchSection = page.locator('div').filter({ has: searchInput }).first();
      const searchButton = searchSection.getByRole('button', { name: '検索', exact: true });
      await expect(searchButton).toBeVisible();
      await searchButton.click();

      await page.waitForLoadState('networkidle');

      // 検索結果が1件であることを確認
      await expect(page.getByRole('cell', { name: '株式会社ABC', exact: true })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByRole('cell', { name: 'DEF株式会社', exact: true })).not.toBeVisible();

      // 検索ボックスをクリアして再検索
      await searchInput.clear();
      await searchButton.click();

      await page.waitForLoadState('networkidle');

      // 全件表示されることを確認（シードデータの3件 + テストで作成した1件）
      await expect(page.getByRole('cell', { name: '株式会社ABC', exact: true })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByRole('cell', { name: 'DEF株式会社', exact: true })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'GHI工業', exact: true })).toBeVisible();
    });
  });
});
