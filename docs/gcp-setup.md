# GCP設定手順書

Cloud Run上でSQLiteデータベースを永続化するために必要なGCP設定の手順書です。

## 前提条件

- GCP プロジェクトが作成済みであること
- `gcloud` CLI がインストールされていること
- 適切な権限を持つアカウントでログインしていること

## 1. GCS バケットの作成

SQLiteデータベースのバックアップを保存するGCSバケットを作成します。

```bash
# プロジェクトIDを設定
export PROJECT_ID=daily-report-482808
export REGION=asia-northeast1
export BUCKET_NAME=${PROJECT_ID}-litestream

# GCS バケットを作成
gcloud storage buckets create gs://${BUCKET_NAME} \
  --project=${PROJECT_ID} \
  --location=${REGION} \
  --uniform-bucket-level-access

# バケットのライフサイクルルールを設定（オプション：古いバージョンを自動削除）
cat > /tmp/lifecycle.json << EOF
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 30, "isLive": false}
    }
  ]
}
EOF

gcloud storage buckets update gs://${BUCKET_NAME} --lifecycle-file=/tmp/lifecycle.json
```

## 2. Cloud Run サービスアカウントへの権限付与

Cloud Run がGCSバケットにアクセスできるように、サービスアカウントに権限を付与します。

```bash
# Cloud Run のデフォルトサービスアカウントを取得
export SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# または、専用のサービスアカウントを使用している場合
# export SERVICE_ACCOUNT="your-service-account@${PROJECT_ID}.iam.gserviceaccount.com"

# GCS バケットへのアクセス権限を付与
gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

### 専用サービスアカウントを作成する場合（推奨）

```bash
# サービスアカウントを作成
gcloud iam service-accounts create daily-report-cloudrun \
  --display-name="Daily Report Cloud Run Service Account" \
  --project=${PROJECT_ID}

export SERVICE_ACCOUNT="daily-report-cloudrun@${PROJECT_ID}.iam.gserviceaccount.com"

# GCS バケットへのアクセス権限を付与
gcloud storage buckets add-iam-policy-binding gs://${BUCKET_NAME} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"

# Secret Manager へのアクセス権限を付与（JWT_SECRET用）
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

## 3. Secret Manager の設定

JWT_SECRETをSecret Managerに登録します。

```bash
# シークレットを作成
echo -n "your-secure-jwt-secret-here" | gcloud secrets create JWT_SECRET \
  --data-file=- \
  --project=${PROJECT_ID} \
  --replication-policy="automatic"

# または、ファイルから作成
# gcloud secrets create JWT_SECRET \
#   --data-file=/path/to/secret.txt \
#   --project=${PROJECT_ID}

# シークレットの確認
gcloud secrets describe JWT_SECRET --project=${PROJECT_ID}
```

### シークレットの更新

```bash
# 新しいバージョンを追加
echo -n "new-jwt-secret" | gcloud secrets versions add JWT_SECRET --data-file=-
```

## 4. GitHub Secrets の設定

GitHub ActionsのSecretsに以下を設定します。

| シークレット名 | 説明 | 値の例 |
|--------------|------|--------|
| `WIF_PROVIDER` | Workload Identity Federation Provider | `projects/123456789/locations/global/workloadIdentityPools/github/providers/github` |
| `WIF_SERVICE_ACCOUNT` | サービスアカウント | `github-actions@daily-report-482808.iam.gserviceaccount.com` |
| `LITESTREAM_REPLICA_BUCKET` | GCSバケット名 | `daily-report-482808-litestream` |

### 設定方法

1. GitHubリポジトリの **Settings** > **Secrets and variables** > **Actions** を開く
2. **New repository secret** をクリック
3. 上記のシークレットをそれぞれ登録

## 5. Cloud Run サービスの設定確認

デプロイ後、Cloud Runサービスの設定を確認します。

```bash
# サービスの環境変数を確認
gcloud run services describe daily-report \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="yaml(spec.template.spec.containers[0].env)"

# サービスのシークレット設定を確認
gcloud run services describe daily-report \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="yaml(spec.template.spec.containers[0].volumeMounts)"
```

## 6. 動作確認

### GCSバケットの確認

```bash
# バケットの内容を確認（デプロイ後）
gcloud storage ls gs://${BUCKET_NAME}/daily-report/

# WALファイルの一覧
gcloud storage ls gs://${BUCKET_NAME}/daily-report/prod.db/
```

### Cloud Run ログの確認

```bash
# 起動ログを確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=daily-report" \
  --project=${PROJECT_ID} \
  --limit=50 \
  --format="table(timestamp, textPayload)"
```

## トラブルシューティング

### 1. GCSへのアクセス権限エラー

```
Error: storage: bucket doesn't exist or permission denied
```

**解決方法**:
- サービスアカウントに `roles/storage.objectAdmin` 権限が付与されているか確認
- バケット名が正しいか確認

### 2. データベース復元エラー

```
Error: no matching backups found
```

**解決方法**:
- 初回デプロイ時はバックアップが存在しないため、このエラーは正常
- 起動スクリプトが新規DBを作成するので、そのまま続行

### 3. Prismaマイグレーションエラー

```
Error: P3009: migrate found failed migrations
```

**解決方法**:
- マイグレーション履歴をリセット（開発環境のみ）
- または、失敗したマイグレーションを修正

## セキュリティ考慮事項

1. **最小権限の原則**: サービスアカウントには必要最小限の権限のみを付与
2. **バケットアクセス制限**: バケットは `uniform-bucket-level-access` を有効化し、公開アクセスを禁止
3. **シークレット管理**: JWT_SECRETはSecret Managerで管理し、コードにハードコードしない
4. **ログ監査**: Cloud Auditログを有効化して、アクセスを監視

## コスト概算（月額）

| リソース | 概算コスト |
|---------|-----------|
| GCS Standard Storage (1GB) | ~$0.02 |
| GCS オペレーション | ~$0.01 |
| Secret Manager (1シークレット) | ~$0.06 |
| Cloud Run (最小構成) | ~$5-10 |
| **合計** | **~$5-15** |

※ 実際のコストは使用量により変動します。
