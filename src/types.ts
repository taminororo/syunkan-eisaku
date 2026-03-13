export type Level = 'beginner' | 'intermediate' | 'advanced'
export type InputTab = 'text' | 'voice'
export type AppPhase = 'setup' | 'generating' | 'question' | 'feedback'

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
  timestamp: Date
}

export interface FeedbackResult {
  score: number
  corrections: string[]
  modelAnswer: string
  feedback: string
  pronunciationNote?: string
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
