export type Level = 'beginner' | 'intermediate' | 'advanced'
export type InputTab = 'text' | 'voice'
export type AppPhase = 'setup' | 'generating' | 'question' | 'feedback'

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

export interface DashboardData {
  totalAnswers: number
  averageScore: number
  categoryCounts: Record<string, number>
  recentScores: { score: number; timestamp: string }[]
  topWeakCategories: WeakCategory[]
}

// ─── Web Speech API ───────────────────────────────────────────────────────────

export interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

export interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((e: ISpeechRecognitionEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}

export type SpeechRecognitionCtor = new () => ISpeechRecognition
export type VoiceState = 'idle' | 'recording' | 'done'

export interface UseVoiceInput {
  supported: boolean
  voiceState: VoiceState
  interimText: string
  finalText: string
  start: () => void
  stop: () => void
  reset: () => void
}
