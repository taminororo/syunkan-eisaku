import { useEffect, useState } from 'react'
import type { ReviewItem, ReviewProblem } from '../types'
import { fetchReviewList } from '../api/client'
import { formatDuration } from '../speed'
import { SituationIcon } from './SituationIcon'
import { LevelBadge } from './LevelBadge'

interface Props {
  onSelect: (problem: ReviewProblem) => void
}

/**
 * 生の解答記録（1回 = 1 ReviewItem）を、問題文ごとにまとめて
 * 「1問 = 複数 attempt」の ReviewProblem に変換する。
 *
 * 同じ japanese を複数回解いていれば、その回数分の attempt を
 * 1つの ReviewProblem.attempts に集める。これがスコア推移の元データになる。
 *
 * TODO(human): items を受け取り ReviewProblem[] を返す。
 *   - japanese をキーに記録をグループ化する（Map<string, ReviewProblem> が書きやすい）
 *   - 各 ReviewProblem.attempts は「古い順」に並べる
 *     （入力 items は新しい順なので、attempts は逆順に積むか最後に reverse する）
 *   - 返す配列（問題）の並び順も決める（例: 最近解いた問題を上に / 解いた回数が多い順 など）
 */
function groupReviewItems(items: ReviewItem[]): ReviewProblem[] {
  const byProblem = new Map<string, ReviewProblem>()

  // items は新しい順。先頭に積めば attempts は古い順になる。
  for (const item of items) {
    const attempt = { score: item.score, elapsedMs: item.elapsedMs, timestamp: item.timestamp }
    const existing = byProblem.get(item.japanese)
    if (existing) {
      existing.attempts.unshift(attempt)
    } else {
      byProblem.set(item.japanese, {
        japanese: item.japanese,
        situation: item.situation,
        level: item.level,
        attempts: [attempt],
      })
    }
  }

  // Map は挿入順を保つ。最初に登場した = 最近解いた問題なので、その順（最近順）で返す。
  return [...byProblem.values()]
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-text-primary'
  return 'text-error'
}

// 各回のスコアを「85 → 70 → 92」のように推移表示する
function ScoreTrend({ attempts }: { attempts: ReviewProblem['attempts'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {attempts.map((a, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-text-secondary text-xs">→</span>}
          <span className={`font-semibold text-sm ${scoreColor(a.score)}`}>{a.score}</span>
        </span>
      ))}
    </span>
  )
}

// 各回の所要時間を「12.3秒 → 8.1秒」のように推移表示する（計測値がある回のみ）
function SpeedTrend({ attempts }: { attempts: ReviewProblem['attempts'] }) {
  const timed = attempts.filter(a => typeof a.elapsedMs === 'number')
  if (timed.length === 0) return null
  return (
    <span className="inline-flex items-center gap-1 flex-wrap text-text-secondary">
      <span className="text-xs">⏱</span>
      {timed.map((a, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-xs">→</span>}
          <span className="text-xs tabular-nums">{formatDuration(a.elapsedMs as number)}</span>
        </span>
      ))}
    </span>
  )
}

export function ReviewListScreen({ onSelect }: Props) {
  const [problems, setProblems] = useState<ReviewProblem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchReviewList()
      .then(list => { if (!cancelled) setProblems(groupReviewItems(list)) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : '取得に失敗しました') })
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className="rounded-xl border border-error bg-error-bg px-4 py-3 animate-fade-in">
        <p className="text-sm text-error">{error}</p>
      </div>
    )
  }

  if (problems === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 animate-fade-in">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-sm text-text-secondary">復習リストを読み込み中…</p>
      </div>
    )
  }

  if (problems.length === 0) {
    return (
      <div className="rounded-2xl border border-border px-5 py-16 text-center animate-fade-in">
        <p className="text-sm text-text-secondary">
          まだ復習できる問題がありません。<br />
          ログインして問題を解くと、ここに表示されます。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <p className="text-sm text-text-secondary">解き直したい問題を選んでください</p>
      <ul className="space-y-2">
        {problems.map((problem, i) => (
          <li key={`${problem.japanese}-${i}`}>
            <button
              onClick={() => onSelect(problem)}
              className="w-full text-left rounded-2xl border border-border hover:border-accent
                bg-bg-secondary px-5 py-4 transition-colors active:scale-[0.99]"
              style={{ transitionDuration: 'var(--duration-fast)' }}
            >
              <p className="text-base font-medium text-text-primary leading-relaxed mb-2">
                {problem.japanese}
              </p>
              <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1">
                    <SituationIcon situation={problem.situation} className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    {problem.situation}
                  </span>
                  <LevelBadge level={problem.level} />
                </span>
                <span className="inline-flex items-center gap-2">
                  {problem.attempts.length > 1 && (
                    <span className="text-text-secondary">{problem.attempts.length}回</span>
                  )}
                  <ScoreTrend attempts={problem.attempts} />
                </span>
              </div>
              <div className="mt-1.5 flex justify-end">
                <SpeedTrend attempts={problem.attempts} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
