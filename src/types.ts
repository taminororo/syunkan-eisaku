export type Level = 'beginner' | 'intermediate' | 'advanced'
export type InputTab = 'text' | 'voice'
export type AppPhase = 'setup' | 'review' | 'generating' | 'question' | 'feedback'

export type WeakCategory =
  | 'articles' | 'tense' | 'word_order' | 'prepositions'
  | 'vocabulary' | 'spelling' | 'plurals' | 'conjunctions'

export interface WeakCategoryEntry {
  category: WeakCategory
  severity: 'minor' | 'major'
}

export interface AnswerRecord {
  id?: number
  japanese: string
  situation: string
  level: Level
  userAnswer: string
  inputMethod: InputTab
  score: number
  feedback: string
  modelAnswer: string
  weakCategories?: WeakCategoryEntry[]
  elapsedMs?: number // 問題表示から送信までの所要時間
  timestamp: Date
}

export interface FeedbackResult {
  score: number
  corrections: string[]
  modelAnswer: string
  feedback: string
  pronunciationNote?: string
  weakCategories?: WeakCategoryEntry[]
}

export interface SharedResult {
  japanese: string
  userAnswer: string
  score: number
  modelAnswer: string
  corrections: string[]
  feedback: string
  pronunciationNote?: string | null
  situation: string
  level: Level
  createdAt: string
}

export interface User {
  id: string
  nickname: string
  avatarUrl: string
  provider: 'google' | 'github'
}

export interface HistorySummary {
  score: number
  weakCategories: WeakCategoryEntry[]
  situation: string
  level: Level
  timestamp: string
}

// /api/review が返す「1回分」の生の記録
export interface ReviewItem {
  japanese: string
  score: number
  elapsedMs?: number
  situation: string
  level: Level
  timestamp: string
}

// 問題ごとにまとめた解答履歴（スコア推移の表示に使う）
export interface ReviewAttempt {
  score: number
  elapsedMs?: number
  timestamp: string
}

export interface ReviewProblem {
  japanese: string
  situation: string
  level: Level
  attempts: ReviewAttempt[] // 古い順（推移をそのまま左→右で描ける）
}

export interface DashboardData {
  totalAnswers: number
  averageScore: number
  averageElapsedMs: number | null // 計測値が1つもなければ null
  categoryCounts: Record<string, number>
  recentScores: { score: number; timestamp: string }[]
  recentTimes: { elapsedMs: number; timestamp: string }[]
  topWeakCategories: WeakCategory[]
}

// ─── 音声入力（Whisper API） ────────────────────────────────────────────────────

// idle: 待機 / recording: 録音中 / transcribing: Whisperで変換中 / done: 結果確定
export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'done'

export interface UseVoiceInput {
  supported: boolean
  voiceState: VoiceState
  finalText: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}
