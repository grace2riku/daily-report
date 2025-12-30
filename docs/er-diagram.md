# 営業日報システム ER図

## エンティティ一覧

| エンティティ | 説明 |
|--------------|------|
| sales_persons | 営業担当者マスタ（上長も含む） |
| customers | 顧客マスタ |
| daily_reports | 日報 |
| visit_records | 訪問記録 |
| comments | コメント |

## ER図

```mermaid
erDiagram
    sales_persons {
        int id PK
        varchar employee_code UK
        varchar name
        varchar email UK
        varchar password_hash
        enum role "member/manager/admin"
        int manager_id FK
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    customers {
        int id PK
        varchar customer_code UK
        varchar name
        varchar address
        varchar phone
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    daily_reports {
        int id PK
        int sales_person_id FK
        date report_date
        text problem
        text plan
        enum status "draft/submitted/reviewed"
        timestamp created_at
        timestamp updated_at
    }

    visit_records {
        int id PK
        int daily_report_id FK
        int customer_id FK
        time visit_time
        text content
        int sort_order
        timestamp created_at
        timestamp updated_at
    }

    comments {
        int id PK
        int daily_report_id FK
        int commenter_id FK
        text content
        timestamp created_at
        timestamp updated_at
    }

    sales_persons ||--o{ sales_persons : "上長-部下"
    sales_persons ||--o{ daily_reports : "作成"
    sales_persons ||--o{ comments : "投稿"
    daily_reports ||--o{ visit_records : "含む"
    daily_reports ||--o{ comments : "紐づく"
    customers ||--o{ visit_records : "訪問先"
```

## リレーション説明

| 関係 | 説明 |
|------|------|
| sales_persons → sales_persons | 上長-部下の階層関係（自己参照） |
| sales_persons → daily_reports | 営業担当者が日報を作成（1:N） |
| sales_persons → comments | 営業担当者（上長）がコメントを投稿（1:N） |
| daily_reports → visit_records | 日報に複数の訪問記録を含む（1:N） |
| daily_reports → comments | 日報に複数のコメントが紐づく（1:N） |
| customers → visit_records | 顧客が訪問先として記録される（1:N） |
