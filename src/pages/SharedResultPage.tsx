import { useState, useEffect, useCallback } from 'react'
import type { SharedResult, FeedbackResult, InputTab } from '../types'
import { SituationIcon } from '../components/SituationIcon'
import { useDarkMode } from '../hooks/useDarkMode'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { fetchFeedback, postShare } from '../api/client'
import { LevelBadge } from '../components/LevelBadge'
import { ScoreBadge } from '../components/ScoreBadge'
import { VoiceInputPanel } from '../components/VoiceInputPanel'
import { GradingOverlay } from '../components/GradingOverlay'
import { SunIcon, MoonIcon } from '../components/Icons'

type Phase = 'view' | 'challenge' | 'grading' | 'suspense' | 'comparison'
type SharePhase = 'idle' | 'loading' | 'ready' | 'error'

export function SharedResultPage({ id }: { id: string }) {
  const { dark, toggle: toggleDark } = useDarkMode()
  const [data, setData] = useState<SharedResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Battle state
  const [phase, setPhase] = useState<Phase>('view')
  const [inputTab, setInputTab] = useState<InputTab>('text')
  const [textAnswer, setTextAnswer] = useState('')
  const [voiceEditedText, setVoiceEditedText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [myResult, setMyResult] = useState<FeedbackResult | null>(null)
  const [myAnswer, setMyAnswer] = useState('')

  // Share state for User B
  const [sharePhase, setSharePhase] = useState<SharePhase>('idle')
  const [shareId, setShareId] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const voice = useVoiceInput()

  useEffect(() => {
    fetch(`/api/share/${id}`)
      .then(async res => {
        const json = await res.json() as SharedResult & { error?: string }
        if (!res.ok) throw new Error(json.error ?? '読み込みに失敗しました')
        setData(json)
      })
      .catch(e => setError(e instanceof Error ? e.message : '読み込みに失敗しました'))
      .finally(() => setLoading(false))
  }, [id])

  const startChallenge = () => {
    setPhase('challenge')
    setTextAnswer('')
    setVoiceEditedText('')
    voice.reset()
    setSubmitError(null)
  }

  const submitAnswer = useCallback(async () => {
    if (!data) return
    const answer = inputTab === 'text' ? textAnswer.trim() : voiceEditedText.trim()
    if (!answer) return

    setSubmitting(true)
    setSubmitError(null)
    setPhase('grading')

    try {
      const result = await fetchFeedback(data.japanese, answer, inputTab)
      setMyAnswer(answer)
      setMyResult(result)
      // Suspense pause before revealing result
      setPhase('suspense')
      setTimeout(() => setPhase('comparison'), 500)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '添削に失敗しました')
      setPhase('challenge')
    } finally {
      setSubmitting(false)
    }
  }, [data, inputTab, textAnswer, voiceEditedText])

  const handleShare = async () => {
    if (!data || !myResult) return
    setSharePhase('loading')
    setShareError(null)
    try {
      const newId = await postShare({
        japanese: data.japanese,
        userAnswer: myAnswer,
        score: myResult.score,
        modelAnswer: myResult.modelAnswer,
        corrections: myResult.corrections,
        feedback: myResult.feedback,
        pronunciationNote: myResult.pronunciationNote,
        situation: data.situation,
        level: data.level,
      })
      setShareId(newId)
      setSharePhase('ready')
    } catch (e) {
      setShareError(e instanceof Error ? e.message : '共有に失敗しました')
      setSharePhase('error')
    }
  }

  const handleCopy = async () => {
    if (!shareId) return
    const url = `${window.location.origin}/share/${shareId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : ''
  const shareText = myResult ? `瞬間英作文で${myResult.score}点！\n問題: ${data?.japanese ?? ''}` : ''
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`
  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`

  const battleVerdict = myResult && data
    ? myResult.score > data.score ? 'win' : myResult.score < data.score ? 'lose' : 'draw'
    : null

  const verdictStyle = {
    win:  'bg-success-bg text-success',
    lose: 'bg-error-bg text-error',
    draw: 'bg-warning-bg text-warning',
  }

  const verdictLabel = {
    win: 'WIN!',
    lose: 'LOSE...',
    draw: 'DRAW',
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
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-error bg-error-bg px-5 py-10 text-center space-y-4 animate-fade-in">
            <p className="text-sm text-error">{error}</p>
            <a
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
            >
              トレーニングを始める
            </a>
          </div>
        )}

        {data && (
          <>
            {/* Situation / Level */}
            <div className="flex items-center gap-2 text-sm text-text-secondary animate-fade-in">
              <span className="inline-flex items-center gap-1.5">
                <SituationIcon situation={data.situation} className="w-4 h-4 shrink-0" strokeWidth={2} />
                {data.situation}
              </span>
              <LevelBadge level={data.level} />
            </div>

            {/* Problem card */}
            <div className="rounded-2xl border border-border overflow-hidden animate-slide-up-enter">
              <div className="px-5 py-3 bg-bg-secondary">
                <span className="text-xs text-text-secondary font-medium">問題</span>
              </div>
              <div className="px-5 py-5">
                <p className="text-xl font-medium leading-relaxed">{data.japanese}</p>
              </div>
            </div>

            {/* ── Phase: view ── */}
            {phase === 'view' && (
              <>
                <div className="flex items-center gap-3 animate-fade-in-up stagger-1">
                  <ScoreBadge score={data.score} animate={false} />
                  <span className="text-sm text-text-secondary">
                    {data.score >= 90 ? '素晴らしい！' : data.score >= 70 ? 'よくできました' : data.score >= 50 ? 'もう少し！' : '頑張ろう'}
                  </span>
                </div>

                {/* Answer comparison */}
                <div className="rounded-xl border border-border overflow-hidden animate-fade-in-up stagger-2">
                  <div className="px-4 py-2 bg-bg-secondary text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    解答比較
                  </div>
                  <div className="divide-y divide-border">
                    <div className="px-4 py-3 flex gap-3">
                      <span className="shrink-0 mt-0.5 text-xs font-semibold text-text-secondary w-16">解答</span>
                      <p className="text-sm text-text-primary leading-relaxed">{data.userAnswer}</p>
                    </div>
                    <div className="px-4 py-3 flex gap-3 bg-success-bg">
                      <span className="shrink-0 mt-0.5 text-xs font-semibold text-success w-16">模範解答</span>
                      <p className="text-sm font-medium leading-relaxed">{data.modelAnswer}</p>
                    </div>
                  </div>
                </div>

                {/* Corrections */}
                {data.corrections.length > 0 && (
                  <div className="rounded-xl border border-warning-border overflow-hidden animate-fade-in-up stagger-3">
                    <div className="px-4 py-2 bg-warning-bg text-xs font-semibold text-warning uppercase tracking-wide">
                      修正ポイント
                    </div>
                    <ul className="divide-y divide-warning-border">
                      {data.corrections.map((c, i) => (
                        <li key={i} className="px-4 py-2.5 text-sm text-text-primary flex gap-2">
                          <span className="text-warning mt-0.5">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Feedback */}
                <div className="rounded-xl border border-accent-border overflow-hidden animate-fade-in-up stagger-4">
                  <div className="px-4 py-2 bg-accent-bg text-xs font-semibold text-accent uppercase tracking-wide">
                    フィードバック
                  </div>
                  <p className="px-4 py-3 text-sm text-text-primary leading-relaxed">
                    {data.feedback}
                  </p>
                </div>

                {/* Pronunciation Note */}
                {data.pronunciationNote && (
                  <div className="rounded-xl border border-accent-border overflow-hidden animate-fade-in-up stagger-5">
                    <div className="px-4 py-2 bg-accent-bg text-xs font-semibold text-accent uppercase tracking-wide">
                      発音メモ
                    </div>
                    <p className="px-4 py-3 text-sm text-text-primary leading-relaxed">
                      {data.pronunciationNote}
                    </p>
                  </div>
                )}

                {/* Challenge CTA */}
                <button
                  onClick={startChallenge}
                  className="block w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm
                    transition-all active:scale-[0.98] animate-fade-in-up stagger-5"
                  style={{ transitionDuration: 'var(--duration-fast)' }}
                >
                  この問題に挑戦する
                </button>

                <a
                  href="/"
                  className="block w-full py-3.5 rounded-xl border border-border text-text-primary font-semibold text-sm
                    transition-colors text-center hover:bg-bg-secondary animate-fade-in-up stagger-6"
                >
                  自分もトレーニングする
                </a>
              </>
            )}

            {/* ── Phase: challenge ── */}
            {phase === 'challenge' && (
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
                        {tab === 'text' ? 'テキスト' : `音声${!voice.supported ? '（非対応）' : ''}`}
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
                        className="w-full px-4 py-3 rounded-xl border border-border
                          bg-bg-secondary text-text-primary text-sm
                          resize-none focus:outline-none focus-ring-animate
                          placeholder:text-text-secondary"
                      />
                      <button
                        onClick={submitAnswer}
                        disabled={!textAnswer.trim() || submitting}
                        className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40
                          text-white font-semibold text-sm transition-all active:scale-[0.98]"
                        style={{ transitionDuration: 'var(--duration-fast)' }}
                      >
                        {submitting ? '添削中…' : '送信して添削'}
                      </button>
                    </div>
                  ) : (
                    <VoiceInputPanel
                      voice={voice}
                      editedText={voiceEditedText}
                      onEditedTextChange={setVoiceEditedText}
                      onSubmit={submitAnswer}
                      loading={submitting}
                    />
                  )}
                </div>

                {submitError && (
                  <div className="rounded-xl border border-error bg-error-bg px-4 py-3 mt-3 animate-fade-in">
                    <p className="text-sm text-error">{submitError}</p>
                  </div>
                )}

                <button
                  onClick={() => setPhase('view')}
                  className="block w-full py-3 rounded-xl border border-border mt-3
                    text-text-secondary font-medium text-sm hover:bg-bg-secondary transition-colors text-center"
                >
                  戻る
                </button>
              </div>
            )}

            {/* ── Phase: grading ── */}
            {phase === 'grading' && <GradingOverlay />}

            {/* ── Phase: suspense ── */}
            {phase === 'suspense' && (
              <div className="rounded-2xl border border-border px-5 py-20 flex items-center justify-center animate-fade-in">
                <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              </div>
            )}

            {/* ── Phase: comparison ── */}
            {phase === 'comparison' && myResult && battleVerdict && (
              <>
                {/* Score comparison with count-up */}
                <div className="rounded-2xl border border-border overflow-hidden animate-scale-in">
                  <div className="px-4 py-2 bg-bg-secondary text-xs font-semibold text-text-secondary uppercase tracking-wide text-center">
                    スコア比較
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="px-4 py-5 flex flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-text-secondary">相手</span>
                      <ScoreBadge score={data.score} animate />
                    </div>
                    <div className="px-4 py-5 flex flex-col items-center gap-2">
                      <span className="text-xs font-semibold text-accent">あなた</span>
                      <ScoreBadge score={myResult.score} animate />
                    </div>
                  </div>
                  {/* Win/Lose/Draw banner */}
                  <div className={`px-4 py-3 text-center text-lg font-bold font-display animate-result-flash ${verdictStyle[battleVerdict]}`}>
                    {verdictLabel[battleVerdict]}
                  </div>
                </div>

                {/* Answer comparison: both users */}
                <div className="rounded-xl border border-border overflow-hidden animate-fade-in-up stagger-2">
                  <div className="px-4 py-2 bg-bg-secondary text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    解答比較
                  </div>
                  <div className="divide-y divide-border">
                    <div className="px-4 py-3 flex gap-3">
                      <span className="shrink-0 mt-0.5 text-xs font-semibold text-text-secondary w-16">相手</span>
                      <p className="text-sm text-text-primary leading-relaxed">{data.userAnswer}</p>
                    </div>
                    <div className="px-4 py-3 flex gap-3">
                      <span className="shrink-0 mt-0.5 text-xs font-semibold text-accent w-16">あなた</span>
                      <p className="text-sm text-text-primary leading-relaxed">{myAnswer}</p>
                    </div>
                    <div className="px-4 py-3 flex gap-3 bg-success-bg">
                      <span className="shrink-0 mt-0.5 text-xs font-semibold text-success w-16">模範解答</span>
                      <p className="text-sm font-medium leading-relaxed">{myResult.modelAnswer}</p>
                    </div>
                  </div>
                </div>

                {/* Your corrections */}
                {myResult.corrections.length > 0 && (
                  <div className="rounded-xl border border-warning-border overflow-hidden animate-fade-in-up stagger-3">
                    <div className="px-4 py-2 bg-warning-bg text-xs font-semibold text-warning uppercase tracking-wide">
                      あなたの修正ポイント
                    </div>
                    <ul className="divide-y divide-warning-border">
                      {myResult.corrections.map((c, i) => (
                        <li key={i} className="px-4 py-2.5 text-sm text-text-primary flex gap-2">
                          <span className="text-warning mt-0.5">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Your feedback */}
                <div className="rounded-xl border border-accent-border overflow-hidden animate-fade-in-up stagger-4">
                  <div className="px-4 py-2 bg-accent-bg text-xs font-semibold text-accent uppercase tracking-wide">
                    あなたへのフィードバック
                  </div>
                  <p className="px-4 py-3 text-sm text-text-primary leading-relaxed">
                    {myResult.feedback}
                  </p>
                </div>

                {/* Your pronunciation note */}
                {myResult.pronunciationNote && (
                  <div className="rounded-xl border border-accent-border overflow-hidden animate-fade-in-up stagger-5">
                    <div className="px-4 py-2 bg-accent-bg text-xs font-semibold text-accent uppercase tracking-wide">
                      発音メモ
                    </div>
                    <p className="px-4 py-3 text-sm text-text-primary leading-relaxed">
                      {myResult.pronunciationNote}
                    </p>
                  </div>
                )}

                {/* Share section for User B */}
                <div className="rounded-xl border border-border overflow-hidden animate-fade-in-up stagger-5">
                  <div className="px-4 py-2 bg-bg-secondary text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    結果を共有
                  </div>
                  <div className="px-4 py-3">
                    {sharePhase === 'idle' && (
                      <button
                        onClick={handleShare}
                        className="w-full py-2.5 rounded-xl border border-border
                          text-text-primary font-medium text-sm
                          hover:bg-bg-secondary transition-colors"
                      >
                        共有リンクを生成
                      </button>
                    )}

                    {sharePhase === 'loading' && (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        <span className="text-sm text-text-secondary">生成中…</span>
                      </div>
                    )}

                    {sharePhase === 'ready' && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <a
                            href={lineUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b04c] text-white font-semibold text-sm transition-colors text-center"
                          >
                            LINE
                          </a>
                          <a
                            href={xUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-300 text-white dark:text-gray-900 font-semibold text-sm transition-colors text-center"
                          >
                            X
                          </a>
                          <button
                            onClick={handleCopy}
                            className="flex-1 py-2.5 rounded-xl border border-border
                              text-text-primary font-semibold text-sm
                              hover:bg-bg-secondary transition-colors"
                          >
                            {copied ? 'コピー済！' : 'リンクコピー'}
                          </button>
                        </div>
                        <p className="text-xs text-text-secondary break-all">{shareUrl}</p>
                      </div>
                    )}

                    {sharePhase === 'error' && (
                      <div className="space-y-2">
                        <p className="text-sm text-error">{shareError}</p>
                        <button
                          onClick={handleShare}
                          className="w-full py-2.5 rounded-xl border border-border
                            text-text-primary font-medium text-sm
                            hover:bg-bg-secondary transition-colors"
                        >
                          再試行
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <a
                  href="/"
                  className="block w-full py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm
                    transition-all text-center active:scale-[0.98] animate-fade-in-up stagger-6"
                  style={{ transitionDuration: 'var(--duration-fast)' }}
                >
                  自分もトレーニングする
                </a>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
