import { useState } from 'react'
import type { FeedbackResult, Level } from '../types'
import { WEAK_CATEGORY_LABELS } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { postShare } from '../api/client'
import { ScoreBadge } from './ScoreBadge'

type SharePhase = 'idle' | 'loading' | 'ready' | 'error'

interface FeedbackCardProps {
  result: FeedbackResult
  userAnswer: string
  japanese: string
  situation: string
  level: Level
  onNext: () => void
  onEnd: () => void
}

export function FeedbackCard({ result, userAnswer, japanese, situation, level, onNext, onEnd }: FeedbackCardProps) {
  const { user } = useAuth()
  const [sharePhase, setSharePhase] = useState<SharePhase>('idle')
  const [shareId, setShareId] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : ''
  const shareText = `瞬間英作文で${result.score}点！\n問題: ${japanese}`

  const handleShare = async () => {
    setSharePhase('loading')
    setShareError(null)
    try {
      const id = await postShare({
        japanese,
        userAnswer,
        score: result.score,
        modelAnswer: result.modelAnswer,
        corrections: result.corrections,
        feedback: result.feedback,
        pronunciationNote: result.pronunciationNote,
        situation,
        level,
      })
      setShareId(id)
      setSharePhase('ready')
    } catch (e) {
      setShareError(e instanceof Error ? e.message : '共有に失敗しました')
      setSharePhase('error')
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`
  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`

  return (
    <div className="space-y-4">
      {/* Score with count-up + confetti */}
      <div className="flex items-center gap-3 animate-fade-in-up stagger-1">
        <ScoreBadge score={result.score} animate />
        <span className="text-sm text-text-secondary">
          {result.score >= 90 ? '素晴らしい！' : result.score >= 70 ? 'よくできました' : result.score >= 50 ? 'もう少し！' : '頑張ろう'}
        </span>
      </div>

      {/* Answer Comparison — staggered */}
      <div className="rounded-xl border border-border overflow-hidden animate-fade-in-up stagger-2">
        <div className="px-4 py-2 bg-bg-secondary text-xs font-semibold text-text-secondary uppercase tracking-wide">
          解答比較
        </div>
        <div className="divide-y divide-border">
          <div className="px-4 py-3 flex gap-3">
            <span className="shrink-0 mt-0.5 text-xs font-semibold text-text-secondary w-16">あなた</span>
            <p className="text-sm text-text-primary leading-relaxed">{userAnswer}</p>
          </div>
          <div className="px-4 py-3 flex gap-3 bg-success-bg">
            <span className="shrink-0 mt-0.5 text-xs font-semibold text-success w-16">模範解答</span>
            <p className="text-sm font-medium text-text-primary leading-relaxed">{result.modelAnswer}</p>
          </div>
        </div>
      </div>

      {/* Corrections — staggered */}
      {result.corrections.length > 0 && (
        <div className="rounded-xl border border-warning-border overflow-hidden animate-fade-in-up stagger-3">
          <div className="px-4 py-2 bg-warning-bg text-xs font-semibold text-warning uppercase tracking-wide">
            修正ポイント
          </div>
          <ul className="divide-y divide-warning-border">
            {result.corrections.map((c, i) => (
              <li key={i} className="px-4 py-2.5 text-sm text-text-primary flex gap-2">
                <span className="text-warning mt-0.5">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback — staggered */}
      <div className="rounded-xl border border-accent-border overflow-hidden animate-fade-in-up stagger-4">
        <div className="px-4 py-2 bg-accent-bg text-xs font-semibold text-accent uppercase tracking-wide">
          フィードバック
        </div>
        <p className="px-4 py-3 text-sm text-text-primary leading-relaxed">
          {result.feedback}
        </p>
      </div>

      {/* Weak Categories — staggered */}
      {result.weakCategories && result.weakCategories.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden animate-fade-in-up stagger-5">
          <div className="px-4 py-2 bg-bg-secondary text-xs font-semibold text-text-secondary uppercase tracking-wide">
            弱点カテゴリ
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {result.weakCategories.map((wc, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  wc.severity === 'major'
                    ? 'bg-error-bg text-error'
                    : 'bg-warning-bg text-warning'
                }`}
              >
                {WEAK_CATEGORY_LABELS[wc.category] ?? wc.category}
                <span className="text-[10px] opacity-70">{wc.severity === 'major' ? 'major' : 'minor'}</span>
              </span>
            ))}
          </div>
          {!user && (
            <div className="px-4 py-2 border-t border-border">
              <p className="text-xs text-text-secondary">
                <a href="/api/auth/google" className="text-accent hover:underline">ログイン</a>すると弱点の傾向を分析できます
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pronunciation Note — staggered */}
      {result.pronunciationNote && (
        <div className="rounded-xl border border-accent-border overflow-hidden animate-fade-in-up stagger-5">
          <div className="px-4 py-2 bg-accent-bg text-xs font-semibold text-accent uppercase tracking-wide">
            発音メモ
          </div>
          <p className="px-4 py-3 text-sm text-text-primary leading-relaxed">
            {result.pronunciationNote}
          </p>
        </div>
      )}

      {/* Share — staggered */}
      <div className="rounded-xl border border-border overflow-hidden animate-fade-in-up stagger-6">
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

      {/* Actions — staggered */}
      <div className="flex gap-2 animate-fade-in-up stagger-6">
        <button
          onClick={onEnd}
          className="py-3 px-4 rounded-xl border border-border
            text-text-primary font-medium text-sm hover:bg-bg-secondary
            transition-colors"
        >
          終了
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white
            font-semibold text-sm transition-colors flex items-center justify-center gap-2
            active:scale-[0.98]"
          style={{ transitionDuration: 'var(--duration-fast)' }}
        >
          次の問題へ
          <span>→</span>
        </button>
      </div>
    </div>
  )
}
