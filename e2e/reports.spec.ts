import { expect, test, type Page } from '@playwright/test';

import { login } from './helpers/auth';

/**
 * 日報機能 E2Eテスト
 *
 * テスト仕様書のE2E-010, E2E-011, E2E-012に対応するテストシナリオ
 *
 * テストデータ:
 * - 一般営業: yamada@example.com / member123
 * - 上長: manager@example.com / manager123
 * - 管理者: admin@example.com / admin123
 *
 * 顧客データ:
 * - 株式会社ABC (C001)
 * - DEF株式会社 (C002)
 * - GHI工業 (C003)
 *
 * 注意:
 * - テスト実行前に `npx prisma db push --force-reset && npm run db:seed` を実行してください
 * - シードデータとして昨日の日報が1件存在します
 * - 初回実行時はNext.jsのコンパイルに時間がかかるため、事前にサーバーを起動して
 *   ウォームアップしておくとテストが安定します
 * - CI環境では事前ビルド（npm run build）を実行することを推奨します
 */

// テストのタイムアウトを延長（初回コンパイル・API初期化考慮）
test.setTimeout(300000);

// テストを直列実行（同じ日付の日報重複を避けるため）
test.describe.configure({ mode: 'serial' });

/**
 * 顧客選択を行うヘルパー関数
 */
async function selectCustomer(page: Page, customerName: string, index: number = 0) {
  // 訪問記録のセクション内で、指定インデックスの顧客選択トリガーを探す
  const triggers = page.locator('[data-slot="select-trigger"]').filter({ hasText: '顧客を選択' });
  const trigger = triggers.nth(index);

  await trigger.waitFor({ state: 'visible', timeout: 10000 });
  await trigger.click();

  // ドロップダウンが開くのを待つ
  await page.waitForSelector('[data-slot="select-content"]', { state: 'visible', timeout: 5000 });

  // 顧客アイテムをクリック
  const item = page.locator('[data-slot="select-item"]').filter({ hasText: customerName });
  await item.waitFor({ state: 'visible', timeout: 5000 });
  await item.click();

  // ドロップダウンが閉じるのを待つ
  await page.waitForTimeout(300);
}

/**
 * カレンダーから指定日数前の日付を選択するヘルパー関数
 */
async function selectDateDaysAgo(page: Page, daysAgo: number) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);

  // 月が異なる場合は前月に移動する必要がある
  const today = new Date();
  const monthDiff =
    today.getMonth() -
    targetDate.getMonth() +
    (today.getFullYear() - targetDate.getFullYear()) * 12;

  // DatePickerをクリック
  const datePicker = page
    .locator('button')
    .filter({ hasText: /報告日を選択|年/ })
    .first();
  await datePicker.click();
  await page.waitForSelector('[data-slot="calendar"]', { state: 'visible' });

  // 前月に移動
  for (let i = 0; i < monthDiff; i++) {
    // react-day-picker の前月ボタンを使用
    const prevButton = page.locator('[data-slot="calendar"]').locator('button.rdp-button_previous');
    await prevButton.click();
    await page.waitForTimeout(300);
  }

  // 日付ボタンをクリック（data-day属性を使用）
  // data-day属性は "MM/DD/YYYY" 形式
  const targetDateStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
  const dayButton = page.locator(`[data-slot="calendar"] button[data-day="${targetDateStr}"]`);
  await dayButton.click();
  await page.waitForTimeout(200);
}

/**
 * ユニークな日付のオフセットを取得（テスト間で重複しない日付を使用）
 */
let dateOffset = 2; // 昨日はシードデータで使用済みなので2日前から開始
function getUniqueDateOffset(): number {
  return dateOffset++;
}

test.describe('E2E-010: 日報作成シナリオ', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'yamada@example.com', 'member123');
  });

  test('[E2E-010-01] 日報新規作成 - 新規作成ボタンから日報を作成し、一覧に追加される', async ({
    page,
  }) => {
    // 1. ダッシュボードで新規作成ボタンをクリック
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();
    await page.click('a[href="/reports/new"]');

    // 日報作成画面に遷移
    await page.waitForURL('/reports/new');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: '日報作成' })).toBeVisible();

    // 2. 報告日を選択（ユニークな過去日付）
    const daysAgo = getUniqueDateOffset();
    await selectDateDaysAgo(page, daysAgo);

    // 3. 訪問記録を追加
    // 顧客選択（読み込み完了を待つ）
    await page.waitForSelector('button:has-text("顧客を選択")', {
      state: 'visible',
      timeout: 10000,
    });
    await selectCustomer(page, '株式会社ABC', 0);

    // 訪問時刻入力
    await page.fill('input[type="time"]', '10:00');

    // 4. 訪問内容入力
    await page.fill(
      'textarea[name="visitRecords.0.content"]',
      '新製品の提案を実施。次回見積もり提出予定。'
    );

    // 5. Problem/Plan入力
    await page.fill('textarea[name="problem"]', 'A社への提案価格について上長に相談したい。');
    await page.fill('textarea[name="plan"]', 'B社へ見積もり提出\nC社アポイント調整');

    // 6. 提出ボタンクリック
    await page.click('button:has-text("提出")');

    // 7. ダッシュボードにリダイレクト
    await page.waitForURL('/', { timeout: 30000 });

    // 日報一覧が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 10000 });

    // 作成した日報が一覧に表示されていることを確認（担当者名で確認）
    await expect(page.locator('text=山田 太郎')).toBeVisible();
  });

  test('[E2E-010-02] 下書き保存 - 日報を下書きとして保存できる', async ({ page }) => {
    // 日報作成画面に遷移
    await page.goto('/reports/new');
    await page.waitForLoadState('networkidle');

    // ユニークな過去日付を選択
    const daysAgo = getUniqueDateOffset();
    await selectDateDaysAgo(page, daysAgo);

    // 顧客選択と訪問内容入力
    await page.waitForSelector('button:has-text("顧客を選択")', {
      state: 'visible',
      timeout: 10000,
    });
    await selectCustomer(page, 'DEF株式会社', 0);
    await page.fill('textarea[name="visitRecords.0.content"]', '下書き保存テスト - 訪問内容');

    // Problem/Plan入力
    await page.fill('textarea[name="problem"]', '下書きテスト - 課題');

    // 下書き保存ボタンクリック
    await page.click('button:has-text("下書き保存")');

    // ダッシュボードにリダイレクト
    await page.waitForURL('/', { timeout: 30000 });

    // 日報一覧が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 10000 });

    // 下書きステータスの日報が表示されていることを確認
    await expect(page.locator('text=下書き')).toBeVisible();
  });

  test('[E2E-010-03] 訪問記録複数追加 - 複数の訪問記録を登録して提出できる', async ({ page }) => {
    // 日報作成画面に遷移
    await page.goto('/reports/new');
    await page.waitForLoadState('networkidle');

    // ユニークな過去日付を選択
    const daysAgo = getUniqueDateOffset();
    await selectDateDaysAgo(page, daysAgo);

    // 訪問記録の追加ボタンを2回クリック（合計3件にする）
    await page.click('button:has-text("追加")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("追加")');
    await page.waitForTimeout(500);

    // 1件目の訪問記録入力
    await page.waitForSelector('button:has-text("顧客を選択")', {
      state: 'visible',
      timeout: 10000,
    });
    await selectCustomer(page, '株式会社ABC', 0);
    await page.fill('input[type="time"]', '09:00');
    await page.fill('textarea[name="visitRecords.0.content"]', '訪問記録1 - 新製品提案');

    // 2件目の訪問記録入力
    await selectCustomer(page, 'DEF株式会社', 0);
    await page.fill('textarea[name="visitRecords.1.content"]', '訪問記録2 - 定期訪問');
    // 訪問時刻は2件目のinput
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(1).fill('11:00');

    // 3件目の訪問記録入力
    await selectCustomer(page, 'GHI工業', 0);
    await page.fill('textarea[name="visitRecords.2.content"]', '訪問記録3 - 新規開拓');
    await timeInputs.nth(2).fill('14:00');

    // 3件の訪問記録があることを確認
    await expect(page.locator('text=#1')).toBeVisible();
    await expect(page.locator('text=#2')).toBeVisible();
    await expect(page.locator('text=#3')).toBeVisible();

    // 提出
    await page.click('button:has-text("提出")');
    await page.waitForURL('/', { timeout: 30000 });

    // 日報一覧が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('E2E-011: 日報編集シナリオ', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'yamada@example.com', 'member123');
  });

  test('[E2E-011-01] 日報編集 - 既存日報の内容を編集して保存できる', async ({ page }) => {
    // まず下書きの日報を作成
    await page.goto('/reports/new');
    await page.waitForLoadState('networkidle');

    const daysAgo = getUniqueDateOffset();
    await selectDateDaysAgo(page, daysAgo);

    await page.waitForSelector('button:has-text("顧客を選択")', {
      state: 'visible',
      timeout: 10000,
    });
    await selectCustomer(page, '株式会社ABC', 0);
    await page.fill('textarea[name="visitRecords.0.content"]', '編集前の訪問内容');
    await page.fill('textarea[name="problem"]', '編集前の課題');
    await page.click('button:has-text("下書き保存")');
    await page.waitForURL('/', { timeout: 30000 });

    // 日報詳細画面へ遷移（最新の日報をクリック）
    const detailButtons = page.locator('a').filter({ hasText: '詳細' });
    await detailButtons.first().click();
    await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });

    // 詳細画面が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible();
    await expect(page.locator('text=編集前の訪問内容')).toBeVisible();

    // 編集ボタンクリック
    await page.click('a:has-text("編集")');
    await page.waitForURL(/\/reports\/\d+\/edit/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // 内容を修正
    await page.fill(
      'textarea[name="visitRecords.0.content"]',
      '編集後の訪問内容 - 詳細を追記しました'
    );
    await page.fill('textarea[name="problem"]', '編集後の課題 - 更新済み');

    // 保存（提出）
    await page.click('button:has-text("提出")');

    // 詳細画面にリダイレクト
    await page.waitForURL(/\/reports\/\d+$/, { timeout: 30000 });

    // 更新された内容が表示されていることを確認
    await expect(page.locator('text=編集後の訪問内容')).toBeVisible();
    await expect(page.locator('text=編集後の課題')).toBeVisible();
  });

  test('[E2E-011-02] 訪問記録削除 - 複数の訪問記録から一部を削除できる', async ({ page }) => {
    // 複数の訪問記録を持つ日報を作成
    await page.goto('/reports/new');
    await page.waitForLoadState('networkidle');

    const daysAgo = getUniqueDateOffset();
    await selectDateDaysAgo(page, daysAgo);

    // 追加ボタンをクリックして2件目を追加
    await page.click('button:has-text("追加")');
    await page.waitForTimeout(500);

    // 1件目の訪問記録
    await page.waitForSelector('button:has-text("顧客を選択")', {
      state: 'visible',
      timeout: 10000,
    });
    await selectCustomer(page, '株式会社ABC', 0);
    await page.fill('textarea[name="visitRecords.0.content"]', '削除しない訪問記録');

    // 2件目の訪問記録
    await selectCustomer(page, 'DEF株式会社', 0);
    await page.fill('textarea[name="visitRecords.1.content"]', '削除する訪問記録');

    await page.click('button:has-text("下書き保存")');
    await page.waitForURL('/', { timeout: 30000 });

    // 詳細画面へ遷移
    const detailButtons = page.locator('a').filter({ hasText: '詳細' });
    await detailButtons.first().click();
    await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });

    // 編集画面へ遷移
    await page.click('a:has-text("編集")');
    await page.waitForURL(/\/reports\/\d+\/edit/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // 2件の訪問記録があることを確認
    await expect(page.locator('text=#1')).toBeVisible();
    await expect(page.locator('text=#2')).toBeVisible();

    // 2件目の削除ボタンをクリック
    const deleteButtons = page
      .locator('button[aria-label*="削除"], button:has-text("削除")')
      .filter({ hasNotText: '' });
    const trashButtons = page.locator('button svg.lucide-trash-2').locator('..');
    if ((await trashButtons.count()) > 1) {
      await trashButtons.nth(1).click();
    } else {
      // 代替: aria-labelで探す
      await deleteButtons.nth(1).click();
    }
    await page.waitForTimeout(300);

    // 1件のみになっていることを確認
    await expect(page.locator('text=#1')).toBeVisible();
    await expect(page.locator('text=#2')).not.toBeVisible();

    // 保存
    await page.click('button:has-text("提出")');
    await page.waitForURL(/\/reports\/\d+$/, { timeout: 30000 });

    // 削除しなかった訪問記録のみが表示されていることを確認
    await expect(page.locator('text=削除しない訪問記録')).toBeVisible();
    await expect(page.locator('text=削除する訪問記録')).not.toBeVisible();
  });
});

test.describe('E2E-012: 日報閲覧シナリオ', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'yamada@example.com', 'member123');
  });

  test('[E2E-012-01] 日報詳細表示 - 一覧から日報を選択して詳細画面を表示できる', async ({
    page,
  }) => {
    // ダッシュボードで日報一覧が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();

    // シードデータの日報（昨日の日報）があることを確認
    await expect(page.locator('text=山田 太郎')).toBeVisible();

    // 詳細ボタンをクリック
    const detailButtons = page.locator('a').filter({ hasText: '詳細' });
    await expect(detailButtons.first()).toBeVisible();
    await detailButtons.first().click();

    // 詳細画面に遷移
    await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });

    // 詳細画面の要素が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible();

    // 日報の基本情報が表示されていることを確認
    await expect(page.locator('text=山田 太郎')).toBeVisible();

    // 訪問記録セクションが表示されていることを確認
    await expect(page.locator('text=訪問記録')).toBeVisible();

    // Problem/Plan セクションが表示されていることを確認
    await expect(page.locator('text=Problem')).toBeVisible();
    await expect(page.locator('text=Plan')).toBeVisible();

    // 一覧に戻るボタンが機能することを確認
    await page.click('a:has-text("一覧に戻る")');
    await page.waitForURL('/', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();
  });

  test('[E2E-012-02] 日付フィルタ検索 - 開始日・終了日で日報を絞り込める', async ({ page }) => {
    // ダッシュボードで日報一覧が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();

    // 検索条件セクションが表示されていることを確認
    await expect(page.locator('text=検索条件')).toBeVisible();

    // 検索前の状態を確認
    await page.waitForLoadState('networkidle');

    // 開始日を設定（前月の1日）
    const startDatePicker = page.locator('#start-date').locator('..');
    await startDatePicker.locator('button').click();
    await page.waitForSelector('[data-slot="calendar"]', { state: 'visible' });

    // 前月ボタンを押す
    const prevButton = page.locator('[data-slot="calendar"]').locator('button.rdp-button_previous');
    await prevButton.click();
    await page.waitForTimeout(300);

    // 前月の1日を選択
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const startDateStr = `${lastMonth.getMonth() + 1}/1/${lastMonth.getFullYear()}`;
    const startDayButton = page.locator(
      `[data-slot="calendar"] button[data-day="${startDateStr}"]`
    );
    await startDayButton.click();
    await page.waitForTimeout(200);

    // 終了日を設定（今日）
    const endDatePicker = page.locator('#end-date').locator('..');
    await endDatePicker.locator('button').click();
    await page.waitForSelector('[data-slot="calendar"]', { state: 'visible' });

    // 今日の日付を選択
    const today = new Date();
    const todayStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
    const todayButton = page.locator(`[data-slot="calendar"] button[data-day="${todayStr}"]`);
    await todayButton.click();
    await page.waitForTimeout(200);

    // 検索ボタンをクリック
    await page.click('button:has-text("検索")');

    // 検索結果が表示されるのを待つ
    await page.waitForLoadState('networkidle');

    // 検索後も日報一覧が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();

    // 検索が正常に機能したことを確認（テーブルが存在する）
    await expect(page.locator('table')).toBeVisible();
  });

  test('上長は部下の日報を閲覧できる', async ({ page }) => {
    // 上長でログイン（一度ログアウトしてからログインし直す）
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('/login', { timeout: 30000 });

    // 上長でログイン
    await login(page, 'manager@example.com', 'manager123');

    // ダッシュボードで日報一覧が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報一覧' })).toBeVisible();

    // 部下（山田太郎）の日報が表示されていることを確認
    await expect(page.locator('text=山田 太郎')).toBeVisible();

    // 詳細ボタンをクリック
    const detailButtons = page.locator('a').filter({ hasText: '詳細' });
    await detailButtons.first().click();

    // 詳細画面に遷移
    await page.waitForURL(/\/reports\/\d+/, { timeout: 30000 });

    // 詳細画面が表示されていることを確認
    await expect(page.getByRole('heading', { name: '日報詳細' })).toBeVisible();
    await expect(page.locator('text=山田 太郎')).toBeVisible();

    // 上長はコメント投稿フォームが表示されることを確認
    await expect(page.locator('textarea[placeholder*="コメント"]')).toBeVisible();
  });
});

test.describe('バリデーションエラー', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'yamada@example.com', 'member123');
  });

  test('顧客未選択でエラーが表示される', async ({ page }) => {
    await page.goto('/reports/new');
    await page.waitForLoadState('networkidle');

    // 訪問内容のみ入力（顧客は未選択）
    await page.fill('textarea[name="visitRecords.0.content"]', 'テスト訪問内容');

    // 提出
    await page.click('button:has-text("提出")');

    // エラーメッセージが表示される
    await expect(page.locator('text=顧客を選択してください')).toBeVisible();
  });

  test('訪問内容未入力でエラーが表示される', async ({ page }) => {
    await page.goto('/reports/new');
    await page.waitForLoadState('networkidle');

    // 顧客のみ選択
    await page.waitForSelector('button:has-text("顧客を選択")', {
      state: 'visible',
      timeout: 10000,
    });
    await selectCustomer(page, '株式会社ABC', 0);

    // 訪問内容は空のまま提出
    await page.click('button:has-text("提出")');

    // エラーメッセージが表示される
    await expect(page.locator('text=訪問内容を入力してください')).toBeVisible();
  });
});

test.describe('離脱確認ダイアログ', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'yamada@example.com', 'member123');
  });

  test('未保存の変更がある場合、離脱確認ダイアログが表示される', async ({ page }) => {
    await page.goto('/reports/new');
    await page.waitForLoadState('networkidle');

    // 何か入力
    await page.fill('textarea[name="problem"]', '未保存のテキスト');

    // キャンセルボタンクリック
    await page.click('button:has-text("キャンセル")');

    // 確認ダイアログが表示される
    await expect(page.getByRole('heading', { name: 'ページを離れますか？' })).toBeVisible();

    // ダイアログのキャンセルボタンをクリックして閉じる
    await page.click('button:has-text("キャンセル")');

    // フォームに戻っていることを確認
    await expect(page.locator('textarea[name="problem"]')).toHaveValue('未保存のテキスト');
  });
});
