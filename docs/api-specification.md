# 営業日報システム API仕様書

## 概要

- ベースURL: `/api/v1`
- 認証方式: Bearer Token (JWT)
- レスポンス形式: JSON
- 文字コード: UTF-8

## 共通仕様

### リクエストヘッダー

| ヘッダー名 | 必須 | 説明 |
|------------|------|------|
| Content-Type | ○ | `application/json` |
| Authorization | △ | `Bearer {token}` ※認証が必要なAPIのみ |

### レスポンス形式

#### 成功時
```json
{
  "success": true,
  "data": { ... }
}
```

#### エラー時
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### 共通エラーコード

| HTTPステータス | コード | 説明 |
|----------------|--------|------|
| 400 | BAD_REQUEST | リクエストが不正 |
| 401 | UNAUTHORIZED | 認証が必要 |
| 403 | FORBIDDEN | 権限がない |
| 404 | NOT_FOUND | リソースが見つからない |
| 409 | CONFLICT | リソースが競合 |
| 422 | VALIDATION_ERROR | バリデーションエラー |
| 500 | INTERNAL_ERROR | サーバーエラー |

### ページネーション

一覧取得APIでは以下のクエリパラメータを使用:

| パラメータ | 型 | デフォルト | 説明 |
|------------|-----|------------|------|
| page | integer | 1 | ページ番号 |
| per_page | integer | 20 | 1ページあたりの件数（最大100） |

レスポンスに含まれるページネーション情報:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_pages": 5,
    "total_count": 100
  }
}
```

---

## 認証 API

### POST /api/v1/auth/login

ログイン認証を行い、アクセストークンを取得する。

#### リクエスト
```json
{
  "email": "yamada@example.com",
  "password": "password123"
}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2025-01-16T10:00:00Z",
    "user": {
      "id": 1,
      "employee_code": "EMP001",
      "name": "山田太郎",
      "email": "yamada@example.com",
      "role": "member"
    }
  }
}
```

#### エラー
| コード | 説明 |
|--------|------|
| INVALID_CREDENTIALS | メールアドレスまたはパスワードが不正 |
| ACCOUNT_DISABLED | アカウントが無効化されている |

---

### POST /api/v1/auth/logout

ログアウト処理を行う。

#### リクエストヘッダー
```
Authorization: Bearer {token}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "message": "ログアウトしました"
  }
}
```

---

### GET /api/v1/auth/me

現在のログインユーザー情報を取得する。

#### リクエストヘッダー
```
Authorization: Bearer {token}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 1,
    "employee_code": "EMP001",
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "member",
    "manager": {
      "id": 3,
      "name": "佐藤次郎"
    }
  }
}
```

---

## 日報 API

### GET /api/v1/reports

日報一覧を取得する。

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| start_date | date | - | 検索開始日（YYYY-MM-DD） |
| end_date | date | - | 検索終了日（YYYY-MM-DD） |
| sales_person_id | integer | - | 営業担当者ID |
| status | string | - | ステータス（draft/submitted/reviewed） |
| page | integer | - | ページ番号 |
| per_page | integer | - | 1ページあたりの件数 |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "report_date": "2025-01-15",
      "sales_person": {
        "id": 1,
        "name": "山田太郎"
      },
      "visit_count": 3,
      "status": "submitted",
      "created_at": "2025-01-15T18:00:00Z",
      "updated_at": "2025-01-15T18:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_pages": 5,
    "total_count": 100
  }
}
```

---

### POST /api/v1/reports

日報を新規作成する。

#### リクエスト
```json
{
  "report_date": "2025-01-15",
  "problem": "A社への提案価格について上長に相談したい。",
  "plan": "B社へ見積もり提出\nC社アポイント調整",
  "status": "draft",
  "visit_records": [
    {
      "customer_id": 1,
      "visit_time": "10:00",
      "content": "新製品の提案を実施。次回見積もり提出予定。"
    },
    {
      "customer_id": 2,
      "visit_time": "14:00",
      "content": "定期訪問。現状のサービスに満足とのこと。"
    }
  ]
}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_date": "2025-01-15",
    "sales_person": {
      "id": 1,
      "name": "山田太郎"
    },
    "problem": "A社への提案価格について上長に相談したい。",
    "plan": "B社へ見積もり提出\nC社アポイント調整",
    "status": "draft",
    "visit_records": [
      {
        "id": 1,
        "customer": {
          "id": 1,
          "name": "株式会社ABC"
        },
        "visit_time": "10:00",
        "content": "新製品の提案を実施。次回見積もり提出予定。",
        "sort_order": 0
      },
      {
        "id": 2,
        "customer": {
          "id": 2,
          "name": "DEF株式会社"
        },
        "visit_time": "14:00",
        "content": "定期訪問。現状のサービスに満足とのこと。",
        "sort_order": 1
      }
    ],
    "created_at": "2025-01-15T18:00:00Z",
    "updated_at": "2025-01-15T18:00:00Z"
  }
}
```

#### エラー
| コード | 説明 |
|--------|------|
| DUPLICATE_REPORT | 同一日付の日報が既に存在する |
| VALIDATION_ERROR | 入力値が不正 |

---

### GET /api/v1/reports/{id}

日報詳細を取得する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | 日報ID |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_date": "2025-01-15",
    "sales_person": {
      "id": 1,
      "name": "山田太郎"
    },
    "problem": "A社への提案価格について上長に相談したい。",
    "plan": "B社へ見積もり提出\nC社アポイント調整",
    "status": "submitted",
    "visit_records": [
      {
        "id": 1,
        "customer": {
          "id": 1,
          "name": "株式会社ABC"
        },
        "visit_time": "10:00",
        "content": "新製品の提案を実施。次回見積もり提出予定。",
        "sort_order": 0
      }
    ],
    "comments": [
      {
        "id": 1,
        "commenter": {
          "id": 3,
          "name": "佐藤次郎"
        },
        "content": "A社の件、明日MTGで相談しましょう。",
        "created_at": "2025-01-15T18:30:00Z"
      }
    ],
    "created_at": "2025-01-15T18:00:00Z",
    "updated_at": "2025-01-15T18:30:00Z"
  }
}
```

---

### PUT /api/v1/reports/{id}

日報を更新する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | 日報ID |

#### リクエスト
```json
{
  "report_date": "2025-01-15",
  "problem": "A社への提案価格について上長に相談したい。（更新）",
  "plan": "B社へ見積もり提出\nC社アポイント調整",
  "status": "submitted",
  "visit_records": [
    {
      "id": 1,
      "customer_id": 1,
      "visit_time": "10:00",
      "content": "新製品の提案を実施。次回見積もり提出予定。（詳細追記）"
    },
    {
      "customer_id": 3,
      "visit_time": "16:30",
      "content": "新規訪問先を追加"
    }
  ]
}
```

※ `visit_records` で `id` が指定されているものは更新、指定されていないものは新規追加、リクエストに含まれていない既存レコードは削除

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_date": "2025-01-15",
    ...
  }
}
```

#### エラー
| コード | 説明 |
|--------|------|
| NOT_FOUND | 日報が見つからない |
| FORBIDDEN | 他人の日報は編集不可 |

---

### DELETE /api/v1/reports/{id}

日報を削除する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | 日報ID |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "message": "日報を削除しました"
  }
}
```

---

## コメント API

### GET /api/v1/reports/{report_id}/comments

日報に紐づくコメント一覧を取得する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| report_id | integer | 日報ID |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "commenter": {
        "id": 3,
        "name": "佐藤次郎"
      },
      "content": "A社の件、明日MTGで相談しましょう。",
      "created_at": "2025-01-15T18:30:00Z",
      "updated_at": "2025-01-15T18:30:00Z"
    }
  ]
}
```

---

### POST /api/v1/reports/{report_id}/comments

コメントを投稿する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| report_id | integer | 日報ID |

#### リクエスト
```json
{
  "content": "A社の件、明日MTGで相談しましょう。"
}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 1,
    "commenter": {
      "id": 3,
      "name": "佐藤次郎"
    },
    "content": "A社の件、明日MTGで相談しましょう。",
    "created_at": "2025-01-15T18:30:00Z",
    "updated_at": "2025-01-15T18:30:00Z"
  }
}
```

#### エラー
| コード | 説明 |
|--------|------|
| FORBIDDEN | コメント権限がない（上長・管理者のみ） |

---

### PUT /api/v1/comments/{id}

コメントを更新する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | コメントID |

#### リクエスト
```json
{
  "content": "A社の件、明日MTGで相談しましょう。（修正）"
}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 1,
    "content": "A社の件、明日MTGで相談しましょう。（修正）",
    "updated_at": "2025-01-15T19:00:00Z"
  }
}
```

---

### DELETE /api/v1/comments/{id}

コメントを削除する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | コメントID |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "message": "コメントを削除しました"
  }
}
```

---

## 営業マスタ API

### GET /api/v1/sales-persons

営業担当者一覧を取得する。

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| is_active | boolean | - | 有効/無効でフィルタ |
| role | string | - | 役職でフィルタ |
| page | integer | - | ページ番号 |
| per_page | integer | - | 1ページあたりの件数 |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "employee_code": "EMP001",
      "name": "山田太郎",
      "email": "yamada@example.com",
      "role": "member",
      "manager": {
        "id": 3,
        "name": "佐藤次郎"
      },
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST /api/v1/sales-persons

営業担当者を新規登録する。（管理者のみ）

#### リクエスト
```json
{
  "employee_code": "EMP004",
  "name": "田中一郎",
  "email": "tanaka@example.com",
  "password": "password123",
  "role": "member",
  "manager_id": 3,
  "is_active": true
}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 4,
    "employee_code": "EMP004",
    "name": "田中一郎",
    "email": "tanaka@example.com",
    "role": "member",
    "manager": {
      "id": 3,
      "name": "佐藤次郎"
    },
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

#### エラー
| コード | 説明 |
|--------|------|
| DUPLICATE_EMPLOYEE_CODE | 社員番号が重複 |
| DUPLICATE_EMAIL | メールアドレスが重複 |

---

### GET /api/v1/sales-persons/{id}

営業担当者詳細を取得する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | 営業ID |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 1,
    "employee_code": "EMP001",
    "name": "山田太郎",
    "email": "yamada@example.com",
    "role": "member",
    "manager": {
      "id": 3,
      "name": "佐藤次郎"
    },
    "subordinates": [
      {
        "id": 5,
        "name": "高橋美咲"
      }
    ],
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-10T00:00:00Z"
  }
}
```

---

### PUT /api/v1/sales-persons/{id}

営業担当者情報を更新する。（管理者のみ）

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | 営業ID |

#### リクエスト
```json
{
  "name": "田中一郎",
  "email": "tanaka@example.com",
  "password": "newpassword123",
  "role": "manager",
  "manager_id": null,
  "is_active": true
}
```

※ `password` は省略可能（省略時は変更しない）

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 4,
    "employee_code": "EMP004",
    "name": "田中一郎",
    ...
  }
}
```

---

### DELETE /api/v1/sales-persons/{id}

営業担当者を削除する（論理削除）。（管理者のみ）

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | 営業ID |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "message": "営業担当者を削除しました"
  }
}
```

---

## 顧客マスタ API

### GET /api/v1/customers

顧客一覧を取得する。

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| keyword | string | - | 顧客名・顧客コードで部分一致検索 |
| is_active | boolean | - | 有効/無効でフィルタ |
| page | integer | - | ページ番号 |
| per_page | integer | - | 1ページあたりの件数 |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer_code": "C001",
      "name": "株式会社ABC",
      "address": "東京都港区...",
      "phone": "03-1234-5678",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST /api/v1/customers

顧客を新規登録する。（管理者のみ）

#### リクエスト
```json
{
  "customer_code": "C004",
  "name": "JKL商事株式会社",
  "address": "東京都港区...",
  "phone": "03-xxxx-xxxx",
  "is_active": true
}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 4,
    "customer_code": "C004",
    "name": "JKL商事株式会社",
    "address": "東京都港区...",
    "phone": "03-xxxx-xxxx",
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

#### エラー
| コード | 説明 |
|--------|------|
| DUPLICATE_CUSTOMER_CODE | 顧客コードが重複 |

---

### GET /api/v1/customers/{id}

顧客詳細を取得する。

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | 顧客ID |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 1,
    "customer_code": "C001",
    "name": "株式会社ABC",
    "address": "東京都港区...",
    "phone": "03-1234-5678",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-10T00:00:00Z"
  }
}
```

---

### PUT /api/v1/customers/{id}

顧客情報を更新する。（管理者のみ）

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | 顧客ID |

#### リクエスト
```json
{
  "name": "JKL商事株式会社（旧：JKL商事）",
  "address": "東京都港区...",
  "phone": "03-xxxx-xxxx",
  "is_active": true
}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "id": 4,
    "customer_code": "C004",
    "name": "JKL商事株式会社（旧：JKL商事）",
    ...
  }
}
```

---

### DELETE /api/v1/customers/{id}

顧客を削除する（論理削除）。（管理者のみ）

#### パスパラメータ

| パラメータ | 型 | 説明 |
|------------|-----|------|
| id | integer | 顧客ID |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "message": "顧客を削除しました"
  }
}
```

---

## API一覧

| メソッド | エンドポイント | 説明 | 権限 |
|----------|----------------|------|------|
| POST | /api/v1/auth/login | ログイン | 全員 |
| POST | /api/v1/auth/logout | ログアウト | 認証済み |
| GET | /api/v1/auth/me | 現在のユーザー情報取得 | 認証済み |
| GET | /api/v1/reports | 日報一覧取得 | 認証済み |
| POST | /api/v1/reports | 日報作成 | 認証済み |
| GET | /api/v1/reports/{id} | 日報詳細取得 | 認証済み |
| PUT | /api/v1/reports/{id} | 日報更新 | 本人 |
| DELETE | /api/v1/reports/{id} | 日報削除 | 本人 |
| GET | /api/v1/reports/{report_id}/comments | コメント一覧取得 | 認証済み |
| POST | /api/v1/reports/{report_id}/comments | コメント投稿 | 上長・管理者 |
| PUT | /api/v1/comments/{id} | コメント更新 | 投稿者 |
| DELETE | /api/v1/comments/{id} | コメント削除 | 投稿者 |
| GET | /api/v1/sales-persons | 営業一覧取得 | 認証済み |
| POST | /api/v1/sales-persons | 営業登録 | 管理者 |
| GET | /api/v1/sales-persons/{id} | 営業詳細取得 | 認証済み |
| PUT | /api/v1/sales-persons/{id} | 営業更新 | 管理者 |
| DELETE | /api/v1/sales-persons/{id} | 営業削除 | 管理者 |
| GET | /api/v1/customers | 顧客一覧取得 | 認証済み |
| POST | /api/v1/customers | 顧客登録 | 管理者 |
| GET | /api/v1/customers/{id} | 顧客詳細取得 | 認証済み |
| PUT | /api/v1/customers/{id} | 顧客更新 | 管理者 |
| DELETE | /api/v1/customers/{id} | 顧客削除 | 管理者 |
