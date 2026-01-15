#!/bin/bash
# Claude Code Hook: ファイル編集後にフォーマッターとリンターを実行
# PostToolUse イベントで Edit|Write ツール使用後に呼び出される

set -e

# stdin から JSON を読み取り、ファイルパスを抽出
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# ファイルパスが空の場合は終了
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# ファイルが存在しない場合は終了（削除された場合など）
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# 対象の拡張子を定義
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    # TypeScript/JavaScript: Prettier + ESLint
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    npx eslint --fix "$FILE_PATH" 2>/dev/null || true
    ;;
  *.json)
    # JSON: Prettier のみ
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    ;;
  *.md)
    # Markdown: Prettier のみ
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    ;;
  *)
    # その他のファイルはスキップ
    ;;
esac

exit 0
