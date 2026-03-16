import { useState } from 'react'
import type { FeedbackResult, Level } from '../types'
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
      <div className="flex items-center gap-3">
        <ScoreBadge score={result.score} />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {result.score >= 90 ? '素晴らしい！' : result.score >= 70 ? 'よくできました' : result.score >= 50 ? 'もう少し！' : '頑張ろう'}
        </span>
      </div>

      {/* Answer Comparison */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          解答比較
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <div className="px-4 py-3 flex gap-3">
            <span className="shrink-0 mt-0.5 text-xs font-semibold text-gray-400 dark:text-gray-500 w-16">あなた</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{userAnswer}</p>
          </div>
          <div className="px-4 py-3 flex gap-3 bg-emerald-50/60 dark:bg-emerald-950/30">
            <span className="shrink-0 mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 w-16">模範解答</span>
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">{result.modelAnswer}</p>
          </div>
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

      {/* Share */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          結果を共有
        </div>
        <div className="px-4 py-3">
          {sharePhase === 'idle' && (
            <button
              onClick={handleShare}
              className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                text-gray-700 dark:text-gray-300 font-medium text-sm
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              共有リンクを生成
            </button>
          )}

          {sharePhase === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-sm text-gray-500 dark:text-gray-400">生成中…</span>
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
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                    text-gray-700 dark:text-gray-300 font-semibold text-sm
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {copied ? 'コピー済！' : 'リンクコピー'}
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 break-all">{shareUrl}</p>
            </div>
          )}

          {sharePhase === 'error' && (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400">{shareError}</p>
              <button
                onClick={handleShare}
                className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                  text-gray-700 dark:text-gray-300 font-medium text-sm
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                再試行
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
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
