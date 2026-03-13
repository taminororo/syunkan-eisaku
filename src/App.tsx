import { useState, useEffect, useRef, useCallback } from 'react'
import Dexie, { type EntityTable } from 'dexie'

// ─── Types ────────────────────────────────────────────────────────────────────

type Level = 'beginner' | 'intermediate' | 'advanced'

interface AnswerRecord {
  id?: number
  japanese: string
  situation: string
  level: Level
  userAnswer: string
  inputMethod: 'text' | 'voice'
  score: number
  feedback: string
  modelAnswer: string
  timestamp: Date
}

interface FeedbackResult {
  score: number
  corrections: string[]
  modelAnswer: string
  feedback: string
  pronunciationNote?: string
}

// ─── Dexie DB ─────────────────────────────────────────────────────────────────

class AppDB extends Dexie {
  answers!: EntityTable<AnswerRecord, 'id'>

  constructor() {
    super('SyunkanEisakuDB')
    this.version(1).stores({ answers: '++id, problemId, timestamp' })
    this.version(2).stores({ answers: '++id, situation, level, timestamp' })
  }
}

const db = new AppDB()

// ─── Situation & Level Data ───────────────────────────────────────────────────

const SITUATIONS = [
  '日常会話',
  'ビジネス・会議',
  '旅行・空港・ホテル',
  'レストラン・買い物',
  '学校・大学',
  'ニュース・時事',
  '自由テーマ',
] as const

type Situation = (typeof SITUATIONS)[number]

const SITUATION_ICONS: Record<Situation, string> = {
  '日常会話': '💬',
  'ビジネス・会議': '💼',
  '旅行・空港・ホテル': '✈️',
  'レストラン・買い物': '🍽️',
  '学校・大学': '📚',
  'ニュース・時事': '📰',
  '自由テーマ': '🎲',
}

const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: 'beginner', label: '初級', desc: '中学英語レベル' },
  { value: 'intermediate', label: '中級', desc: '高校〜大学レベル' },
  { value: 'advanced', label: '上級', desc: '英検準1〜1級' },
]

// ─── Web Speech API types ─────────────────────────────────────────────────────

interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface ISpeechRecognition extends EventTarget {
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

type SpeechRecognitionCtor = new () => ISpeechRecognition

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// ─── Voice Input Hook ─────────────────────────────────────────────────────────

type VoiceState = 'idle' | 'recording' | 'done'

interface UseVoiceInput {
  supported: boolean
  voiceState: VoiceState
  interimText: string
  finalText: string
  start: () => void
  stop: () => void
  reset: () => void
}

function useVoiceInput(): UseVoiceInput {
  const [supported] = useState(() => getSpeechRecognitionCtor() !== null)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const start = useCallback(() => {
    const SR = getSpeechRecognitionCtor()
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false

    rec.onstart = () => setVoiceState('recording')
    rec.onresult = (e: ISpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      setInterimText(interim)
      if (final) setFinalText(prev => (prev + ' ' + final).trim())
    }
    rec.onend = () => {
      setInterimText('')
      setVoiceState('done')
    }
    rec.onerror = () => {
      setInterimText('')
      setVoiceState('idle')
    }

    recognitionRef.current = rec
    rec.start()
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    recognitionRef.current?.abort()
    setVoiceState('idle')
    setInterimText('')
    setFinalText('')
  }, [])

  return { supported, voiceState, interimText, finalText, start, stop, reset }
}

// ─── Dark Mode Hook ───────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) return stored === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('darkMode', String(dark))
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}

// ─── Score Badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950' :
    score >= 70 ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950' :
    score >= 50 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950' :
                  'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-2xl font-bold ${color}`}>
      {score}
      <span className="text-sm font-normal">点</span>
    </span>
  )
}

// ─── Feedback Card ────────────────────────────────────────────────────────────

function FeedbackCard({
  result,
  onNext,
  onEnd,
}: {
  result: FeedbackResult
  onNext: () => void
  onEnd: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ScoreBadge score={result.score} />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {result.score >= 90 ? '素晴らしい！' : result.score >= 70 ? 'よくできました' : result.score >= 50 ? 'もう少し！' : '頑張ろう'}
        </span>
      </div>

      {/* Model Answer */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          模範解答
        </div>
        <div className="px-4 py-3 text-gray-900 dark:text-white font-medium text-base">
          {result.modelAnswer}
        </div>
      </div>

      {/* Corrections */}
      {result.corrections.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            修正ポイント
          </div>
          <ul className="divide-y divide-amber-100 dark:divide-amber-900">
            {result.corrections.map((c, i) => (
              <li key={i} className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback */}
      <div className="rounded-xl border border-blue-100 dark:border-blue-900 overflow-hidden">
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950 text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
          フィードバック
        </div>
        <p className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {result.feedback}
        </p>
      </div>

      {/* Pronunciation Note */}
      {result.pronunciationNote && (
        <div className="rounded-xl border border-purple-100 dark:border-purple-900 overflow-hidden">
          <div className="px-4 py-2 bg-purple-50 dark:bg-purple-950 text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
            発音メモ
          </div>
          <p className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {result.pronunciationNote}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onEnd}
          className="py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700
            text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50
            dark:hover:bg-gray-800 transition-colors"
        >
          終了
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white
            font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          次の問題へ
          <span>→</span>
        </button>
      </div>
    </div>
  )
}

// ─── Voice Input Panel ────────────────────────────────────────────────────────

interface VoiceInputPanelProps {
  voice: UseVoiceInput
  editedText: string
  onEditedTextChange: (t: string) => void
  onSubmit: () => void
  loading: boolean
}

function VoiceInputPanel({ voice, editedText, onEditedTextChange, onSubmit, loading }: VoiceInputPanelProps) {
  const { supported, voiceState, interimText, finalText, start, stop, reset } = voice

  // Sync finalText → editedText when voice finishes
  useEffect(() => {
    if (voiceState === 'done') {
      onEditedTextChange(finalText)
    }
  }, [voiceState, finalText, onEditedTextChange])

  if (!supported) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-400 dark:text-gray-500">
        このブラウザは音声入力に対応していません。<br />テキスト入力をご利用ください。
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Recording area */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 min-h-[100px] p-4 text-sm relative">
        {voiceState === 'idle' && !editedText && (
          <span className="text-gray-400 dark:text-gray-500">マイクボタンで録音を開始してください</span>
        )}
        {voiceState === 'recording' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-500 dark:text-red-400 font-medium">録音中…</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">{finalText}</p>
            {interimText && (
              <p className="text-gray-400 dark:text-gray-500 italic">{interimText}</p>
            )}
          </div>
        )}
        {voiceState === 'done' && (
          <textarea
            value={editedText}
            onChange={e => onEditedTextChange(e.target.value)}
            className="w-full h-full bg-transparent text-gray-900 dark:text-white resize-none focus:outline-none text-sm"
            rows={4}
            placeholder="認識結果を編集できます"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {voiceState === 'idle' && (
          <button
            onClick={start}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white
              font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <MicIcon className="w-4 h-4" />
            録音開始
          </button>
        )}

        {voiceState === 'recording' && (
          <button
            onClick={stop}
            className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white
              font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <StopIcon className="w-4 h-4" />
            録音停止
          </button>
        )}

        {voiceState === 'done' && (
          <>
            <button
              onClick={reset}
              className="py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700
                text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50
                dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            >
              <MicIcon className="w-4 h-4" />
              再録音
            </button>
            <button
              onClick={onSubmit}
              disabled={!editedText.trim() || loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40
                text-white font-semibold text-sm transition-colors"
            >
              {loading ? '添削中…' : '送信'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen({
  situation,
  onSituationChange,
  level,
  onLevelChange,
  onStart,
}: {
  situation: Situation
  onSituationChange: (s: Situation) => void
  level: Level
  onLevelChange: (l: Level) => void
  onStart: () => void
}) {
  return (
    <div className="space-y-6 py-2">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">シチュエーション</h2>
        <div className="grid grid-cols-2 gap-2">
          {SITUATIONS.map(s => (
            <button
              key={s}
              onClick={() => onSituationChange(s)}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium text-left transition-colors
                ${situation === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              {SITUATION_ICONS[s]} {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">難易度</h2>
        <div className="space-y-2">
          {LEVELS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => onLevelChange(value)}
              className={`w-full py-3 px-4 rounded-xl text-left transition-colors flex items-center justify-between
                ${level === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <span className="font-semibold text-sm">{label}</span>
              <span className={`text-xs ${level === value ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
      >
        スタート
      </button>
    </div>
  )
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({
  currentSituation,
  currentLevel,
  onApply,
  onCancel,
}: {
  currentSituation: Situation
  currentLevel: Level
  onApply: (situation: Situation, level: Level) => void
  onCancel: () => void
}) {
  const [situation, setSituation] = useState(currentSituation)
  const [level, setLevel] = useState(currentLevel)

  return (
    <div
      className="fixed inset-0 z-20 bg-black/60 flex items-end"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full rounded-t-2xl p-5 space-y-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">設定変更</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">シチュエーション</h4>
          <div className="grid grid-cols-2 gap-2">
            {SITUATIONS.map(s => (
              <button
                key={s}
                onClick={() => setSituation(s)}
                className={`py-2 px-3 rounded-xl text-sm font-medium text-left transition-colors
                  ${situation === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {SITUATION_ICONS[s]} {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">難易度</h4>
          <div className="flex gap-2">
            {LEVELS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setLevel(value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors
                  ${level === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onApply(situation, level)}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          変更して新しい問題へ
        </button>
      </div>
    </div>
  )
}

// ─── Tiny SVG Icons ───────────────────────────────────────────────────────────

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ─── Level Badge ──────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: Level }) {
  const map: Record<Level, { label: string; cls: string }> = {
    beginner: { label: '初級', cls: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    intermediate: { label: '中級', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    advanced: { label: '上級', cls: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  }
  const { label, cls } = map[level]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type InputTab = 'text' | 'voice'
type AppPhase = 'setup' | 'generating' | 'question' | 'feedback'

export default function App() {
  const { dark, toggle: toggleDark } = useDarkMode()

  // Settings
  const [situation, setSituation] = useState<Situation>(SITUATIONS[0])
  const [level, setLevel] = useState<Level>('beginner')
  const [showSettings, setShowSettings] = useState(false)

  // Phase & session
  const [phase, setPhase] = useState<AppPhase>('setup')
  const [questionCount, setQuestionCount] = useState(0)
  const [scores, setScores] = useState<number[]>([])

  // Current problem
  const [currentJapanese, setCurrentJapanese] = useState('')
  const [generateLoading, setGenerateLoading] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Input state
  const [inputTab, setInputTab] = useState<InputTab>('text')
  const [textAnswer, setTextAnswer] = useState('')
  const [voiceEditedText, setVoiceEditedText] = useState('')

  // Feedback
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const voice = useVoiceInput()

  const resetInput = useCallback(() => {
    setTextAnswer('')
    setVoiceEditedText('')
    voice.reset()
    setFeedbackResult(null)
    setError(null)
  }, [voice])

  const generateProblem = useCallback(async (sit: Situation, lv: Level) => {
    setGenerateLoading(true)
    setGenerateError(null)
    setPhase('generating')
    resetInput()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: sit, level: lv }),
      })

      const data = await res.json() as { japanese?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? '問題の生成に失敗しました')
      if (!data.japanese) throw new Error('問題の生成に失敗しました')

      setCurrentJapanese(data.japanese)
      setQuestionCount(prev => prev + 1)
      setPhase('question')
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : '不明なエラーが発生しました')
      // phase stays 'generating' to show error + retry
    } finally {
      setGenerateLoading(false)
    }
  }, [resetInput])

  const startTraining = () => {
    setScores([])
    setQuestionCount(0)
    generateProblem(situation, level)
  }

  const applySettings = (newSituation: Situation, newLevel: Level) => {
    setSituation(newSituation)
    setLevel(newLevel)
    setShowSettings(false)
    generateProblem(newSituation, newLevel)
  }

  const submitAnswer = useCallback(async () => {
    const answer = inputTab === 'text' ? textAnswer.trim() : voiceEditedText.trim()
    if (!answer) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          japanese: currentJapanese,
          userAnswer: answer,
          inputMethod: inputTab,
        }),
      })

      const data = await res.json() as FeedbackResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? '添削に失敗しました')

      const result: FeedbackResult = {
        score: data.score,
        corrections: data.corrections ?? [],
        modelAnswer: data.modelAnswer,
        feedback: data.feedback,
        pronunciationNote: data.pronunciationNote,
      }

      setFeedbackResult(result)
      setScores(prev => [...prev, result.score])
      setPhase('feedback')

      await db.answers.add({
        japanese: currentJapanese,
        situation,
        level,
        userAnswer: answer,
        inputMethod: inputTab,
        score: result.score,
        feedback: result.feedback,
        modelAnswer: result.modelAnswer,
        timestamp: new Date(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [inputTab, textAnswer, voiceEditedText, currentJapanese, situation, level])

  const goNext = () => generateProblem(situation, level)

  const endSession = () => {
    setPhase('setup')
    setScores([])
    setQuestionCount(0)
  }

  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {phase !== 'setup' && (
              <button
                onClick={endSession}
                className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="設定に戻る"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            )}
            <h1 className="font-bold text-lg tracking-tight">瞬間英作文</h1>
          </div>
          <div className="flex items-center gap-1">
            {phase !== 'setup' && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="設定変更"
              >
                <GearIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="ダークモード切替"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          currentSituation={situation}
          currentLevel={level}
          onApply={applySettings}
          onCancel={() => setShowSettings(false)}
        />
      )}

      {/* Main */}
      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {phase === 'setup' ? (
          <SetupScreen
            situation={situation}
            onSituationChange={setSituation}
            level={level}
            onLevelChange={setLevel}
            onStart={startTraining}
          />
        ) : (
          <>
            {/* Session info bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{SITUATION_ICONS[situation]} {situation}</span>
                <LevelBadge level={level} />
              </div>
              {scores.length > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  平均 {avgScore}点（{scores.length}問）
                </span>
              )}
            </div>

            {/* Generating phase */}
            {phase === 'generating' && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-16 flex flex-col items-center gap-4">
                {generateLoading ? (
                  <>
                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">問題を生成中…</p>
                  </>
                ) : generateError ? (
                  <>
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">{generateError}</p>
                    <button
                      onClick={() => generateProblem(situation, level)}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                    >
                      もう一度生成
                    </button>
                  </>
                ) : null}
              </div>
            )}

            {/* Problem card */}
            {(phase === 'question' || phase === 'feedback') && (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    問題 {questionCount}問目
                  </span>
                  <LevelBadge level={level} />
                </div>
                <div className="px-5 py-5">
                  <p className="text-xl font-medium leading-relaxed text-gray-900 dark:text-white">
                    {currentJapanese}
                  </p>
                </div>
              </div>
            )}

            {/* Question phase: input */}
            {phase === 'question' && (
              <>
                <div className="space-y-3">
                  <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 p-1 gap-1">
                    {(['text', 'voice'] as InputTab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setInputTab(tab)}
                        disabled={tab === 'voice' && !voice.supported}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                          ${inputTab === tab
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                      >
                        {tab === 'text' ? '⌨️ テキスト' : `🎙️ 音声${!voice.supported ? '（非対応）' : ''}`}
                      </button>
                    ))}
                  </div>

                  {inputTab === 'text' ? (
                    <div className="space-y-3">
                      <textarea
                        value={textAnswer}
                        onChange={e => setTextAnswer(e.target.value)}
                        placeholder="英文を入力してください…"
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                          bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm
                          resize-none focus:outline-none focus:ring-2 focus:ring-blue-500
                          placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      />
                      <button
                        onClick={submitAnswer}
                        disabled={!textAnswer.trim() || loading}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40
                          text-white font-semibold text-sm transition-colors"
                      >
                        {loading ? '添削中…' : '送信して添削'}
                      </button>
                    </div>
                  ) : (
                    <VoiceInputPanel
                      voice={voice}
                      editedText={voiceEditedText}
                      onEditedTextChange={setVoiceEditedText}
                      onSubmit={submitAnswer}
                      loading={loading}
                    />
                  )}
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
              </>
            )}

            {/* Feedback */}
            {phase === 'feedback' && feedbackResult && (
              <FeedbackCard result={feedbackResult} onNext={goNext} onEnd={endSession} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
