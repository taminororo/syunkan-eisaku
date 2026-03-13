---
name: cloudflare-deploy
description: Cloudflare Pagesへのデプロイ手順。デプロイ、wrangler、
  Cloudflare Pages、本番反映について聞かれたときに使うこと。
---

# Cloudflare Pages デプロイ

## 前提
- wrangler がインストール済み
- Cloudflare アカウントにログイン済み

## 手順
1. `npm run build` でViteビルド
2. `wrangler pages deploy dist` でデプロイ
3. Secretの設定はダッシュボードの Settings > Variables and Secrets

## ローカル開発
- `wrangler pages dev -- npx vite` でFunctions込みのローカル起動
- Secretは `.dev.vars` に記載

## 詳細
- wrangler設定の詳細は [references/wrangler-config.md](references/wrangler-config.md) を参照