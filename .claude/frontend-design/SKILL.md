---
name: frontend-design
description: UIコンポーネントの作成・変更時に使うデザインガイドライン。
  スタイル変更、コンポーネント実装、画面デザインに関する作業で必ず使うこと。
---

# Flash Compose デザインシステム

## デザイントーン
洗練されたミニマル × 学習アプリの温かみ。
冷たいAI感を排除し、触って気持ちいいUIを目指す。

## 絶対ルール
- CSS変数（tokens.css）のみ使う。ハードコードした色・サイズは禁止
- font-family は --font-display, --font-body, --font-mono のみ
  Inter, Roboto, Arial, system-ui は使わない
- 純黒(#000000) は使わない。ダークは --bg-primary (#1a1a2e)
- アニメーションは CSS transition を優先。duration は --duration-* を使う
- 全コンポーネントでダークモード・ライトモード両対応すること

## トークン参照
- 具体的な値は design-system/tokens.json を参照
- CSS実装は src/styles/tokens.css

## コンポーネントルール
- ボタン: --accent をベースに、hover は --accent-hover
- カード: --bg-surface 背景、--radius-lg の角丸、--shadow-md
- テキスト入力: border は --text-secondary の30%透明度、focus時に --accent
- スコア表示: --font-display、サイズは --size-score (4rem)

## アニメーション基準
- 要素出現: fade-in + translateY(8px)、--duration-normal
- ボタン押下: scale(0.97) → scale(1)、--duration-fast
- 画面遷移: opacity + translateX、--duration-slow
- スコアカウントアップ: 0から最終値へ0.8秒かけてアニメーション