import type { FeedbackResult } from '../types'
import { ScoreBadge } from './ScoreBadge'

interface FeedbackCardProps {
  result: FeedbackResult
  onNext: () => void
  onEnd: () => void
}

export function FeedbackCard({ result, onNext, onEnd }: FeedbackCardProps) {
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
