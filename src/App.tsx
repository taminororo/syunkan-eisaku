import { useState, useEffect, useRef, useCallback } from 'react'
import Dexie, { type EntityTable } from 'dexie'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Problem {
  id: number
  japanese: string
  level: 'beginner' | 'intermediate' | 'advanced'
}

interface AnswerRecord {
  id?: number
  problemId: number
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
  }
}

const db = new AppDB()

// ─── Problem Data ─────────────────────────────────────────────────────────────

const PROBLEMS: Problem[] = [
  { id: 1, japanese: '私は毎朝コーヒーを飲みます。', level: 'beginner' },
  { id: 2, japanese: '彼女は昨日、図書館で本を読みました。', level: 'beginner' },
  { id: 3, japanese: '明日の天気はどうなるでしょうか？', level: 'beginner' },
  { id: 4, japanese: '私はもっと英語を練習する必要があります。', level: 'beginner' },
  { id: 5, japanese: '彼はその問題を解決しようとしましたが、うまくいきませんでした。', level: 'intermediate' },
  { id: 6, japanese: '環境問題は私たち全員が取り組むべき課題です。', level: 'intermediate' },
  { id: 7, japanese: 'もし私があなたなら、その申し出を断らなかったでしょう。', level: 'intermediate' },
  { id: 8, japanese: '彼女が駅に着いたとき、電車はすでに出発していました。', level: 'intermediate' },
  { id: 9, japanese: 'テクノロジーの進歩により、私たちの生活は大きく変わりました。', level: 'advanced' },
  { id: 10, japanese: '多様な文化を理解することは、グローバル社会で生きる上で重要です。', level: 'advanced' },
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

function FeedbackCard({ result, onNext }: { result: FeedbackResult; onNext: () => void }) {
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

      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white
          font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        次の問題へ
        <span>→</span>
      </button>
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

// ─── Level Badge ──────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: Problem['level'] }) {
  const map = {
    beginner: { label: '初級', cls: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    intermediate: { label: '中級', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    advanced: { label: '上級', cls: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  }
  const { label, cls } = map[level]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>{current} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionScreen({ avgScore, onRestart }: { avgScore: number; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="text-5xl">🎉</div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">全問完了！</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          平均スコア: <strong className="text-blue-600 dark:text-blue-400">{avgScore}点</strong>
        </p>
      </div>
      <button
        onClick={onRestart}
        className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
      >
        もう一度挑戦
      </button>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type InputTab = 'text' | 'voice'
type AppPhase = 'question' | 'feedback' | 'complete'

export default function App() {
  const { dark, toggle: toggleDark } = useDarkMode()

  // Problem state
  const [problemIndex, setProblemIndex] = useState(0)
  const [phase, setPhase] = useState<AppPhase>('question')
  const [scores, setScores] = useState<number[]>([])

  // Input state
  const [inputTab, setInputTab] = useState<InputTab>('text')
  const [textAnswer, setTextAnswer] = useState('')
  const [voiceEditedText, setVoiceEditedText] = useState('')

  // Feedback
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const voice = useVoiceInput()

  const currentProblem = PROBLEMS[problemIndex]

  // Reset input when moving to next problem
  useEffect(() => {
    setTextAnswer('')
    setVoiceEditedText('')
    voice.reset()
    setFeedbackResult(null)
    setError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemIndex])

  const getAnswerText = () =>
    inputTab === 'text' ? textAnswer.trim() : voiceEditedText.trim()

  const submitAnswer = useCallback(async () => {
    const answer = getAnswerText()
    if (!answer) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          japanese: currentProblem.japanese,
          userAnswer: answer,
          inputMethod: inputTab,
        }),
      })

      const data = await res.json() as FeedbackResult & { error?: string }

      if (!res.ok) {
        throw new Error(data.error ?? '添削に失敗しました')
      }

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

      // Save to IndexedDB
      await db.answers.add({
        problemId: currentProblem.id,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputTab, textAnswer, voiceEditedText, currentProblem])

  const goNext = () => {
    const next = problemIndex + 1
    if (next >= PROBLEMS.length) {
      setPhase('complete')
    } else {
      setProblemIndex(next)
      setPhase('question')
    }
  }

  const restart = () => {
    setProblemIndex(0)
    setPhase('question')
    setScores([])
  }

  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg tracking-tight">瞬間英作文</h1>
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="ダークモード切替"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {phase === 'complete' ? (
          <CompletionScreen avgScore={avgScore} onRestart={restart} />
        ) : (
          <>
            {/* Progress */}
            <ProgressBar current={problemIndex} total={PROBLEMS.length} />

            {/* Problem card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  問題 {problemIndex + 1}
                </span>
                <LevelBadge level={currentProblem.level} />
              </div>
              <div className="px-5 py-5">
                <p className="text-xl font-medium leading-relaxed text-gray-900 dark:text-white">
                  {currentProblem.japanese}
                </p>
              </div>
            </div>

            {phase === 'question' && (
              <>
                {/* Input tabs */}
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

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
              </>
            )}

            {/* Feedback */}
            {phase === 'feedback' && feedbackResult && (
              <FeedbackCard result={feedbackResult} onNext={goNext} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
