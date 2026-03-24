import { useState, useCallback } from 'react'
import type { Level, FeedbackResult, InputTab, AppPhase } from './types'
import { SITUATIONS, SITUATION_ICONS, type Situation } from './constants'
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
import { SettingsModal } from './components/SettingsModal'
import { LoginButton } from './components/LoginButton'
import { UserMenu } from './components/UserMenu'

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

  const voice = useVoiceInput()

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
      // phase stays 'generating' to show error + retry
    } finally {
      setGenerateLoading(false)
    }
  }, [resetInput, askedQuestions])

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
      const result = await fetchFeedback(currentJapanese, answer, inputTab, situation, level)
      setSubmittedAnswer(answer)
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
        weakCategories: result.weakCategories,
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
    setAskedQuestions([])
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
              <FeedbackCard
                result={feedbackResult}
                userAnswer={submittedAnswer}
                japanese={currentJapanese}
                situation={situation}
                level={level}
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
