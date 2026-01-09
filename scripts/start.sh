#!/bin/bash
set -e

# 営業日報システム 起動スクリプト
# Litestream による SQLite データベースの永続化を管理

DB_PATH="/app/data/prod.db"
LITESTREAM_CONFIG="/etc/litestream.yml"

echo "=== 営業日報システム 起動処理開始 ==="

# 環境変数チェック
if [ -z "$LITESTREAM_REPLICA_BUCKET" ]; then
    echo "[WARNING] LITESTREAM_REPLICA_BUCKET が設定されていません"
    echo "[INFO] Litestream なしでローカルDBモードで起動します"
    LITESTREAM_ENABLED=false
else
    echo "[INFO] Litestream レプリカバケット: $LITESTREAM_REPLICA_BUCKET"
    LITESTREAM_ENABLED=true
fi

# データディレクトリの存在確認
if [ ! -d "/app/data" ]; then
    echo "[INFO] データディレクトリを作成します"
    mkdir -p /app/data
fi

# Litestream が有効な場合、GCS からデータベースを復元
if [ "$LITESTREAM_ENABLED" = true ]; then
    echo "[INFO] GCS からデータベースの復元を試みます..."

    # 既存のDBファイルがない場合のみ復元を試行
    if [ ! -f "$DB_PATH" ]; then
        echo "[INFO] 既存のデータベースが見つかりません。GCS から復元を試みます..."

        # litestream restore を実行（エラーでも続行）
        if litestream restore -config "$LITESTREAM_CONFIG" -if-replica-exists "$DB_PATH"; then
            echo "[INFO] GCS からデータベースを復元しました"
        else
            echo "[INFO] GCS にバックアップが存在しないか、復元に失敗しました"
            echo "[INFO] 新規データベースを作成します"
        fi
    else
        echo "[INFO] 既存のデータベースが見つかりました"
    fi
fi

# データベースが存在しない場合は Prisma で作成
if [ ! -f "$DB_PATH" ]; then
    echo "[INFO] データベースファイルが存在しません。Prisma マイグレーションを実行します..."

    # DATABASE_URL を設定
    export DATABASE_URL="file:$DB_PATH"

    # Prisma マイグレーションを実行（初回デプロイ用）
    npx prisma migrate deploy

    echo "[INFO] データベースを初期化しました"
else
    echo "[INFO] 既存のデータベースが存在します"

    # DATABASE_URL を設定
    export DATABASE_URL="file:$DB_PATH"

    # 保留中のマイグレーションを適用
    echo "[INFO] Prisma マイグレーションを確認・適用します..."
    npx prisma migrate deploy || echo "[WARNING] マイグレーションの適用をスキップしました"
fi

# DATABASE_URL を最終的に設定
export DATABASE_URL="file:$DB_PATH"

echo "[INFO] DATABASE_URL: $DATABASE_URL"

# アプリケーション起動
if [ "$LITESTREAM_ENABLED" = true ]; then
    echo "[INFO] Litestream レプリケーション付きで Next.js を起動します..."

    # Litestream replicate コマンドで Next.js を子プロセスとして起動
    exec litestream replicate -config "$LITESTREAM_CONFIG" -exec "node server.js"
else
    echo "[INFO] Litestream なしで Next.js を起動します..."
    exec node server.js
fi
