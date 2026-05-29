import { useState, useCallback, useRef, useEffect } from 'react'
import type { Level, FeedbackResult, InputTab, AppPhase, ReviewProblem } from './types'
import { SITUATIONS, type Situation } from './constants'
import { SituationIcon } from './components/SituationIcon'
import { db } from './db'
import { fetchGenerateProblem, fetchFeedback } from './api/client'
import { useVoiceInput } from './hooks/useVoiceInput'
import { useDarkMode } from './hooks/useDarkMode'
import { useAuth } from './contexts/AuthContext'
import { ChevronLeftIcon, GearIcon, SunIcon, MoonIcon } from './components/Icons'
import { LevelBadge } from './components/LevelBadge'
import { FeedbackCard } from './components/FeedbackCard'
import { VoiceInputPanel } from './components/VoiceInputPanel'
import { SetupScreen } from './components/SetupScreen'
import { ReviewListScreen } from './components/ReviewListScreen'
import { SettingsModal } from './components/SettingsModal'
import { LoginButton } from './components/LoginButton'
import { UserMenu } from './components/UserMenu'
import { GradingOverlay } from './components/GradingOverlay'
import { TypewriterText } from './components/TypewriterText'
import { CharacterMessage } from './components/CharacterMessage'
import { questionLine } from './character'
import { UserAnswerHint } from './components/UserAnswerHint'
import { clampUserAnswer, countWords } from './userAnswerLimits'
import { MAX_USER_ANSWER_CHARS, MAX_USER_ANSWER_WORDS } from './constants'
import { formatDuration, speedComparisonMessage } from './speed'

export default function App() {
  const { dark, toggle: toggleDark } = useDarkMode()
  const { user, isLoading: authLoading } = useAuth()

  // Settings
  const [situation, setSituation] = useState<Situation>(SITUATIONS[0])
  const [level, setLevel] = useState<Level>('beginner')
  const [showSettings, setShowSettings] = useState(false)

  // Phase & session
  const [phase, setPhase] = useState<AppPhase>('setup')
  const [questionCount, setQuestionCount] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const [askedQuestions, setAskedQuestions] = useState<string[]>([])

  // Review mode: 解き直しのとき、前回スコア/速度を保持して比較表示する（通常出題時は null）
  const [reviewPreviousScore, setReviewPreviousScore] = useState<number | null>(null)
  const [reviewPreviousElapsedMs, setReviewPreviousElapsedMs] = useState<number | null>(null)

  // 速度計測: 問題が表示された時刻。送信時にここからの経過を所要時間とする
  const questionStartRef = useRef<number | null>(null)
  const [lastElapsedMs, setLastElapsedMs] = useState<number | null>(null)

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
  const [submittedAnswer, setSubmittedAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Grading animation
  const [grading, setGrading] = useState(false)

  const voice = useVoiceInput()

  // 問題が表示されたら計測開始。同じ問題でもタイプ演出時間は一定なので比較では相殺される
  useEffect(() => {
    if (phase === 'question') {
      questionStartRef.current = Date.now()
    }
  }, [phase, currentJapanese])

  const resetInput = useCallback(() => {
    setTextAnswer('')
    setVoiceEditedText('')
    voice.reset()
    setFeedbackResult(null)
    setSubmittedAnswer('')
    setError(null)
  }, [voice])

  const generateProblem = useCallback(async (sit: Situation, lv: Level) => {
    setGenerateLoading(true)
    setGenerateError(null)
    setPhase('generating')
    resetInput()

    try {
      const japanese = await fetchGenerateProblem(sit, lv, askedQuestions)
      setCurrentJapanese(japanese)
      setAskedQuestions(prev => [...prev, japanese])
      setQuestionCount(prev => prev + 1)
      setPhase('question')
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : '不明なエラーが発生しました')
    } finally {
      setGenerateLoading(false)
    }
  }, [resetInput, askedQuestions])

  const startTraining = () => {
    setReviewPreviousScore(null)
    setReviewPreviousElapsedMs(null)
    setScores([])
    setQuestionCount(0)
    generateProblem(situation, level)
  }

  // 復習: 保存済みの問題文をそのまま出題画面に流し込む（生成はスキップ）
  const startReview = (problem: ReviewProblem) => {
    const latest = problem.attempts[problem.attempts.length - 1]
    setSituation(problem.situation as Situation)
    setLevel(problem.level)
    setReviewPreviousScore(latest ? latest.score : null)
    setReviewPreviousElapsedMs(latest?.elapsedMs ?? null)
    setScores([])
    setQuestionCount(1)
    resetInput()
    setCurrentJapanese(problem.japanese)
    setPhase('question')
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
    if (answer.length > MAX_USER_ANSWER_CHARS || countWords(answer) > MAX_USER_ANSWER_WORDS) {
      setError(`入力が長すぎます（${MAX_USER_ANSWER_CHARS}文字・${MAX_USER_ANSWER_WORDS}単語以内）`)
      return
    }

    // 問題表示からの経過時間を確定（タイマー未設定なら計測なし）
    const elapsedMs = questionStartRef.current !== null
      ? Date.now() - questionStartRef.current
      : undefined

    setLoading(true)
    setGrading(true)
    setError(null)

    try {
      const result = await fetchFeedback(currentJapanese, answer, inputTab, situation, level, elapsedMs)
      setSubmittedAnswer(answer)
      setFeedbackResult(result)
      setScores(prev => [...prev, result.score])
      setLastElapsedMs(elapsedMs ?? null)
      setGrading(false)
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
        weakCategories: result.weakCategories,
        elapsedMs,
        timestamp: new Date(),
      })
    } catch (e) {
      setGrading(false)
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [inputTab, textAnswer, voiceEditedText, currentJapanese, situation, level])

  const goNext = () => {
    // 復習中は次の問題を生成せず、リストに戻って別の問題を選んでもらう
    if (reviewPreviousScore !== null) {
      setReviewPreviousScore(null)
      setReviewPreviousElapsedMs(null)
      setPhase('review')
      return
    }
    generateProblem(situation, level)
  }

  const endSession = () => {
    setPhase('setup')
    setReviewPreviousScore(null)
    setReviewPreviousElapsedMs(null)
    setScores([])
    setQuestionCount(0)
    setAskedQuestions([])
  }

  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {phase !== 'setup' && (
              <button
                onClick={endSession}
                className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                aria-label="設定に戻る"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            )}
            <h1 className="font-bold text-lg tracking-tight font-display">瞬間英作文</h1>
          </div>
          <div className="flex items-center gap-1">
            {phase !== 'setup' && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                aria-label="設定変更"
              >
                <GearIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
              aria-label="ダークモード切替"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            {!authLoading && (user ? <UserMenu /> : <LoginButton />)}
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
            onReview={() => setPhase('review')}
          />
        ) : phase === 'review' ? (
          <ReviewListScreen onSelect={startReview} />
        ) : (
          <>
            {/* Session info bar */}
            <div className="flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <SituationIcon situation={situation} className="w-4 h-4 shrink-0" strokeWidth={2} />
                  {situation}
                </span>
                <LevelBadge level={level} />
              </div>
              {scores.length > 0 && (
                <span className="text-xs text-text-secondary">
                  平均 {avgScore}点（{scores.length}問）
                </span>
              )}
            </div>

            {/* Generating phase */}
            {phase === 'generating' && (
              <div className="rounded-2xl border border-border px-5 py-16 flex flex-col items-center gap-4 animate-fade-in">
                {generateLoading ? (
                  <>
                    <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    <p className="text-sm text-text-secondary">問題を生成中…</p>
                  </>
                ) : generateError ? (
                  <>
                    <p className="text-sm text-error text-center">{generateError}</p>
                    <button
                      onClick={() => generateProblem(situation, level)}
                      className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
                    >
                      もう一度生成
                    </button>
                  </>
                ) : null}
              </div>
            )}

            {/* Teacher presents the problem */}
            {phase === 'question' && !grading && (
              <div className="animate-fade-in-up">
                <CharacterMessage text={questionLine(questionCount)} />
              </div>
            )}

            {/* Problem card */}
            {(phase === 'question' || phase === 'feedback') && !grading && (
              <div className="rounded-2xl border border-border overflow-hidden animate-slide-up-enter">
                <div className="px-5 py-3 bg-bg-secondary flex items-center justify-between">
                  <span className="text-xs text-text-secondary font-medium">
                    問題 {questionCount}問目
                  </span>
                  <LevelBadge level={level} />
                </div>
                <div className="px-5 py-6">
                  {phase === 'question' ? (
                    <TypewriterText
                      text={currentJapanese}
                      className="text-xl font-medium leading-relaxed text-text-primary"
                    />
                  ) : (
                    <p className="text-xl font-medium leading-relaxed text-text-primary">
                      {currentJapanese}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Grading overlay */}
            {grading && <GradingOverlay />}

            {/* Question phase: input */}
            {phase === 'question' && !grading && (
              <div className="animate-fade-in-up">
                <div className="space-y-3">
                  <div className="flex rounded-xl overflow-hidden border border-border p-1 gap-1">
                    {(['text', 'voice'] as InputTab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setInputTab(tab)}
                        disabled={tab === 'voice' && !voice.supported}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed
                          ${inputTab === tab
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-text-secondary hover:bg-bg-secondary'
                          }`}
                        style={{ transitionDuration: 'var(--duration-normal)' }}
                      >
                        {tab === 'text' ? '⌨️ テキスト' : `🎙️ 音声${!voice.supported ? '（非対応）' : ''}`}
                      </button>
                    ))}
                  </div>

                  {inputTab === 'text' ? (
                    <div className="space-y-3">
                      <textarea
                        value={textAnswer}
                        onChange={e => setTextAnswer(clampUserAnswer(e.target.value))}
                        placeholder="英文を入力してください…"
                        rows={4}
                        maxLength={MAX_USER_ANSWER_CHARS}
                        className="w-full px-4 py-3 rounded-xl border border-border
                          bg-bg-secondary text-text-primary text-sm
                          resize-none focus:outline-none focus-ring-animate
                          placeholder:text-text-secondary"
                      />
                      <UserAnswerHint value={textAnswer} />
                      <button
                        onClick={submitAnswer}
                        disabled={!textAnswer.trim() || loading}
                        className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40
                          text-white font-semibold text-sm transition-all active:scale-[0.98]"
                        style={{ transitionDuration: 'var(--duration-fast)' }}
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
                  <div className="rounded-xl border border-error bg-error-bg px-4 py-3 mt-3 animate-fade-in">
                    <p className="text-sm text-error">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Review: 前回スコア・速度との比較 */}
            {phase === 'feedback' && feedbackResult && reviewPreviousScore !== null && (
              <div className="rounded-xl border border-border bg-bg-secondary px-5 py-4 flex flex-col items-center gap-2 animate-fade-in">
                <div className="flex items-center justify-center gap-4">
                  <span className="text-sm text-text-secondary">前回 {reviewPreviousScore}点</span>
                  <span className="text-text-secondary">→</span>
                  <span className="text-sm font-semibold text-text-primary">今回 {feedbackResult.score}点</span>
                  {feedbackResult.score > reviewPreviousScore && (
                    <span className="text-sm font-semibold text-success">↑ +{feedbackResult.score - reviewPreviousScore}</span>
                  )}
                  {feedbackResult.score < reviewPreviousScore && (
                    <span className="text-sm font-semibold text-error">↓ {feedbackResult.score - reviewPreviousScore}</span>
                  )}
                </div>
                {reviewPreviousElapsedMs !== null && lastElapsedMs !== null && (
                  <div className="flex items-center justify-center gap-3 text-text-secondary">
                    <span className="text-xs">⏱ {formatDuration(reviewPreviousElapsedMs)} → {formatDuration(lastElapsedMs)}</span>
                    {speedComparisonMessage(reviewPreviousElapsedMs, lastElapsedMs) && (
                      <span className="text-xs font-semibold text-accent">
                        {speedComparisonMessage(reviewPreviousElapsedMs, lastElapsedMs)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {phase === 'feedback' && feedbackResult && (
              <FeedbackCard
                result={feedbackResult}
                userAnswer={submittedAnswer}
                japanese={currentJapanese}
                situation={situation}
                level={level}
                elapsedMs={lastElapsedMs ?? undefined}
                onNext={goNext}
                onEnd={endSession}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
