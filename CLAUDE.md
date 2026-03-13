# プロジェクト概要
瞬間英作文Webアプリ。React + TypeScript, Cloudflare Pages。

# コマンド
- dev: `wrangler pages dev -- npx vite`
- build: `npm run build`
- deploy: `wrangler pages deploy dist`
- type check: `npx tsc --noEmit`

# コードスタイル
- ESM（import/export）を使う。require は使わない
- Reactは関数コンポーネント + Hooks のみ
- 1コンポーネント = 1ファイル。App.tsxにロジックを直接書かない

# プロジェクト構成
- src/components/ — UIコンポーネント
- src/api/client.ts — バックエンドAPI呼び出し
- src/types.ts — 共通型定義
- src/constants.ts — 定数（シチュエーション、難易度等）
- functions/api/ — Cloudflare Pages Functions

# 新しいコンポーネント追加時のルール
- components/ に新規ファイルを作る。App.tsxに直接書かない
- API呼び出しは api/client.ts に集約する
- 型定義は types.ts に追加する

# やってはいけないこと
- functions/ 内で Node.js 固有モジュール（fs, path）を使わない（Workers環境）
- localStorage に APIキーや秘密情報を保存しない
- IMPORTANT: コードを変更したら必ず `npx tsc --noEmit` で型チェックを通すこと