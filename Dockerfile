# syntax=docker/dockerfile:1

# ベースイメージ
FROM node:20-alpine AS base

# 依存関係インストール
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Prismaクライアントを生成
RUN npx prisma generate

RUN npm run build

# 本番イメージ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# SQLite と Litestream に必要なパッケージをインストール
# libc6-compat: glibc互換レイヤー（Litestreamバイナリ実行に必要）
RUN apk add --no-cache \
    sqlite \
    ca-certificates \
    wget \
    bash \
    libc6-compat

# Litestream をインストール
ARG LITESTREAM_VERSION=v0.3.13
RUN wget -q -O /tmp/litestream.tar.gz \
    https://github.com/benbjohnson/litestream/releases/download/${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-amd64.tar.gz && \
    tar -xzf /tmp/litestream.tar.gz -C /usr/local/bin && \
    rm /tmp/litestream.tar.gz && \
    chmod +x /usr/local/bin/litestream

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# データディレクトリを作成
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Prisma CLI と tsx をグローバルインストール（マイグレーション・シード実行用）
RUN npm install -g prisma@6.2.1 tsx

# Prismaスキーマ、マイグレーション、シードファイルをコピー
COPY --from=builder /app/prisma ./prisma
# Prisma Client（生成済み）をコピー
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
# シードに必要な依存関係をコピー
COPY --from=builder /app/node_modules/bcrypt ./node_modules/bcrypt
COPY --from=builder /app/node_modules/@mapbox ./node_modules/@mapbox
COPY --from=builder /app/node_modules/node-addon-api ./node_modules/node-addon-api

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Litestream設定ファイルをコピー
COPY --chown=nextjs:nodejs litestream.yml /etc/litestream.yml

# 起動スクリプトをコピー
COPY --chown=nextjs:nodejs scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# データディレクトリの所有権を確認
RUN chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# 起動スクリプトを実行
CMD ["/app/start.sh"]
