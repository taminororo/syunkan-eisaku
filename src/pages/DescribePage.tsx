import { useState } from 'react'
import type { FeedbackResult } from '../types'
import { SCENES } from '../scenes'
import { fetchDescribeFeedback } from '../api/client'
import { useDarkMode } from '../hooks/useDarkMode'
import { clampUserAnswer, countWords } from '../userAnswerLimits'
import { MAX_USER_ANSWER_CHARS, MAX_USER_ANSWER_WORDS } from '../constants'
import { CharacterMessage } from '../components/CharacterMessage'
import { FeedbackCard } from '../components/FeedbackCard'
import { UserAnswerHint } from '../components/UserAnswerHint'
import { GradingOverlay } from '../components/GradingOverlay'
import { SunIcon, MoonIcon } from '../components/Icons'

export function DescribePage() {
  const { dark, toggle: toggleDark } = useDarkMode()
  const [index, setIndex] = useState(() => Math.floor(Math.random() * SCENES.length))
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<FeedbackResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scene = SCENES[index]

  const submit = async () => {
    const text = answer.trim()
    if (!text) return
    if (text.length > MAX_USER_ANSWER_CHARS || countWords(text) > MAX_USER_ANSWER_WORDS) {
      setError(`入力が長すぎます（${MAX_USER_ANSWER_CHARS}文字・${MAX_USER_ANSWER_WORDS}単語以内）`)
      return
    }
    setLoading(true)
    setGrading(true)
    setError(null)
    try {
      const r = await fetchDescribeFeedback(scene.id, text)
      setResult(r)
      setGrading(false)
    } catch (e) {
      setGrading(false)
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const nextScene = () => {
    setIndex(i => (i + 1) % SCENES.length)
    setAnswer('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors">
      <header className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur border-b border-border">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="font-bold text-lg tracking-tight font-display hover:opacity-70 transition-opacity">
            瞬間英作文
          </a>
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            aria-label="ダークモード切替"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-bold font-display">状況を英語で描写しよう</h2>

        {grading && <GradingOverlay />}

        {!grading && (
          <>
            {/* Scene image */}
            <div className="rounded-2xl border border-border overflow-hidden animate-slide-up-enter">
              <img
                src={scene.file}
                alt={scene.label}
                className="w-full aspect-video object-cover bg-bg-secondary"
              />
            </div>

            {result ? (
              <FeedbackCard
                result={result}
                userAnswer={answer.trim()}
                japanese={`${scene.label}の場面`}
                situation="状況描写"
                level="intermediate"
                onNext={nextScene}
                onEnd={() => { window.location.href = '/' }}
              />
            ) : (
              <>
                <CharacterMessage text="この場面で何が起きているか、見たままを英語で説明してみよう！" />

                <div className="space-y-3">
                  <textarea
                    value={answer}
                    onChange={e => setAnswer(clampUserAnswer(e.target.value))}
                    placeholder="例: A barista is handing a cup of coffee to a customer."
                    rows={4}
                    maxLength={MAX_USER_ANSWER_CHARS}
                    className="w-full px-4 py-3 rounded-xl border border-border
                      bg-bg-secondary text-text-primary text-sm
                      resize-none focus:outline-none focus-ring-animate
                      placeholder:text-text-secondary"
                  />
                  <UserAnswerHint value={answer} />
                  <div className="flex gap-2">
                    <button
                      onClick={nextScene}
                      className="py-3 px-4 rounded-xl border border-border text-text-primary
                        font-medium text-sm hover:bg-bg-secondary transition-colors"
                    >
                      別の場面
                    </button>
                    <button
                      onClick={submit}
                      disabled={!answer.trim() || loading}
                      className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40
                        text-white font-semibold text-sm transition-all active:scale-[0.98]"
                      style={{ transitionDuration: 'var(--duration-fast)' }}
                    >
                      {loading ? '採点中…' : '送信して採点'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-error bg-error-bg px-4 py-3 animate-fade-in">
                    <p className="text-sm text-error">{error}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <a
          href="/"
          className="block w-full py-3.5 rounded-xl border border-border text-text-primary font-semibold text-sm transition-colors text-center hover:bg-bg-secondary"
        >
          トレーニングに戻る
        </a>
      </main>
    </div>
  )
}
