# 営業日報システム

営業担当者が日々の活動報告を行い、上長がフィードバックを行うための日報管理システム。

## 機能概要

- **日報管理**: 日報の作成・編集・閲覧・一覧表示
- **訪問記録**: 1日につき複数の顧客訪問記録を登録
- **Problem/Plan**: 課題・相談事項と明日やることを記載
- **コメント機能**: 上長から日報へのフィードバック
- **マスタ管理**: 営業担当者・顧客の登録・編集・削除

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| 言語 | TypeScript |
| フレームワーク | Next.js 16 (App Router) |
| UI | shadcn/ui, Tailwind CSS |
| データベース | Prisma (PostgreSQL) |
| 認証 | JWT (jose) |
| バリデーション | Zod |
| テスト | Vitest, Playwright |
| デプロイ | Google Cloud Cloud Run |

## 開発環境のセットアップ

### 前提条件

- Node.js 20以上
- npm または yarn
- PostgreSQL

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してDATABASE_URLとJWT_SECRETを設定

# データベースのマイグレーション
npm run db:migrate

# シードデータの投入（オプション）
npm run db:seed
```

### 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## 利用可能なスクリプト

### 開発

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバーを起動 |

### コード品質

| コマンド | 説明 |
|----------|------|
| `npm run lint` | ESLintでコードをチェック |
| `npm run lint:fix` | ESLintで自動修正 |
| `npm run format` | Prettierでフォーマット |
| `npm run format:check` | フォーマットをチェック |

### テスト

| コマンド | 説明 |
|----------|------|
| `npm run test` | Vitestでテストを実行 |
| `npm run test:run` | テストを1回実行 |
| `npm run test:coverage` | カバレッジ付きでテスト |
| `npm run test:watch` | ウォッチモードでテスト |
| `npm run test:e2e` | Playwrightで E2E テスト |
| `npm run test:e2e:ui` | E2E テスト (UI モード) |

### データベース

| コマンド | 説明 |
|----------|------|
| `npm run db:generate` | Prisma Client を生成 |
| `npm run db:migrate` | マイグレーションを実行 |
| `npm run db:push` | スキーマをDBに反映 |
| `npm run db:seed` | シードデータを投入 |
| `npm run db:reset` | DBをリセット |
| `npm run db:studio` | Prisma Studio を起動 |

## プロジェクト構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/v1/            # REST API エンドポイント
│   ├── (auth)/            # 認証関連ページ
│   └── (dashboard)/       # ダッシュボード関連ページ
├── components/            # React コンポーネント
│   └── ui/               # shadcn/ui コンポーネント
├── contexts/             # React Context
├── hooks/                # カスタムフック
├── lib/                  # ユーティリティ関数
└── types/                # TypeScript 型定義

prisma/
├── schema.prisma         # データベーススキーマ
└── seed.ts              # シードデータ

docs/
├── api-specification.md  # API仕様書
├── er-diagram.md        # ER図
├── screen-definition.md # 画面定義書
└── test-specification.md # テスト仕様書
```

## ドキュメント

- [API仕様書](docs/api-specification.md)
- [ER図](docs/er-diagram.md)
- [画面定義書](docs/screen-definition.md)
- [テスト仕様書](docs/test-specification.md)

## ライセンス

Private
