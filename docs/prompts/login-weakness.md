報告ありがとう。以下を実装してください。

# タスク: Google/GitHub OAuthログイン + 弱点分析

## ログイン機能

### 方式
- Google OAuth と GitHub OAuth に対応
- 認証フローは Cloudflare Pages Functions で処理
- セッション管理は KV に保存した JWT or セッショントークンで行う
- ログインしなくても使えるが、弱点分析の蓄積にはログインが必要

### エンドポイント
- GET /api/auth/google — Google OAuth開始
- GET /api/auth/github — GitHub OAuth開始
- GET /api/auth/callback — OAuth コールバック処理
- GET /api/auth/me — 現在のユーザー情報取得
- POST /api/auth/logout — ログアウト

### フロントエンド
- ヘッダーにログインボタンを追加（未ログイン時）
- ログイン済みならアバター or ニックネームを表示
- ログイン状態は Cookie のセッショントークンで管理

### 注意
- OAuth の client_id / client_secret は Cloudflare の Secret で管理
- ローカル開発用の .dev.vars にも OAuth のテスト用クレデンシャルを追加

## 弱点分析機能

### 添削結果からの弱点カテゴリ分類
- /api/feedback のプロンプトを拡張して、
  添削結果に weakCategories フィールドを追加で返すようにする
- カテゴリ例: articles（冠詞）, tense（時制）, word_order（語順）,
  prepositions（前置詞）, vocabulary（語彙）, spelling（スペル）,
  plurals（単複）, conjunctions（接続詞）
- 各カテゴリに対して severity: 'minor' | 'major' も返す

### データ蓄積
- ログイン済みユーザーの回答結果をKVに蓄積
  - Key: user:{userId}:history
  - Value: 直近100件の回答サマリー（問題文は除く、カテゴリとスコアのみ）
- ローカルの Dexie にも保存（オフライン対応）

### 弱点ダッシュボード画面
- 新しい画面を追加（ログイン必須）
- 表示内容:
  - カテゴリ別の間違い回数をバーチャート表示
  - 直近10回のスコア推移（折れ線グラフ）
  - 最も弱いカテゴリTOP3
  - 総回答数、平均スコア
- グラフは recharts で描画する（既にReactプロジェクトなので相性がよい）

### 注意
- 未ログインユーザーの既存体験は壊さないこと
- 弱点分析は「ログインするとこれが見れますよ」という導線を作る