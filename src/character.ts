import type { DashboardData } from './types'
import { WEAK_CATEGORY_LABELS } from './constants'
import { formatDuration } from './speed'

// 先生キャラの設定。名前やセリフはここを変えれば全体に反映される。
export const TEACHER_NAME = 'エイミー先生'

// 出題時のセリフ（やさしい励まし系）。問題ごとに順番に切り替える。
const QUESTION_LINES = [
  'じゃあ、次の文を英語にしてみよう！',
  '落ち着いて、これを英語で言ってみてね。',
  'いいペース！次はこちらをどうぞ。',
  '焦らなくて大丈夫。ゆっくり考えてみよう。',
]

// questionCount(1始まり)に応じてセリフを巡回させる。0や負でも安全。
export function questionLine(questionCount: number): string {
  const i = Math.max(0, questionCount - 1) % QUESTION_LINES.length
  return QUESTION_LINES[i]
}

// ダッシュボードのデータを見て、やさしい励まし系のコメントを組み立てる。
export function dashboardComment(data: DashboardData): string {
  const parts: string[] = [`これまで${data.totalAnswers}問、よく頑張ったね！`]

  if (data.averageScore >= 80) {
    parts.push(`平均${data.averageScore}点はとても安定しているよ。`)
  } else if (data.averageScore >= 60) {
    parts.push(`平均${data.averageScore}点、着実に力がついてきているよ。`)
  } else {
    parts.push(`平均${data.averageScore}点。ここから一緒に伸ばしていこう。`)
  }

  if (data.averageElapsedMs !== null) {
    parts.push(`平均${formatDuration(data.averageElapsedMs)}で答えられているね。`)
  }

  if (data.topWeakCategories.length > 0) {
    const label = WEAK_CATEGORY_LABELS[data.topWeakCategories[0]] ?? data.topWeakCategories[0]
    parts.push(`いまは「${label}」を意識すると、ぐっと良くなりそう。`)
  }

  return parts.join('')
}
