import { useState, useEffect } from 'react'
import type { SharedResult } from '../types'
import { SITUATION_ICONS, type Situation } from '../constants'
import { useDarkMode } from '../hooks/useDarkMode'
import { LevelBadge } from '../components/LevelBadge'
import { ScoreBadge } from '../components/ScoreBadge'
import { SunIcon, MoonIcon } from '../components/Icons'

export function SharedResultPage({ id }: { id: string }) {
  const { dark, toggle: toggleDark } = useDarkMode()
  const [data, setData] = useState<SharedResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const situationIcon = data
    ? (SITUATION_ICONS[data.situation as Situation] ?? '📝')
    : null

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="font-bold text-lg tracking-tight hover:opacity-70 transition-opacity">
            瞬間英作文
          </a>
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="ダークモード切替"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-5 py-10 text-center space-y-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <a
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              トレーニングを始める
            </a>
          </div>
        )}

        {data && (
          <>
            {/* Situation / Level */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{situationIcon} {data.situation}</span>
              <LevelBadge level={data.level} />
            </div>

            {/* Problem card */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">問題</span>
              </div>
              <div className="px-5 py-5">
                <p className="text-xl font-medium leading-relaxed">{data.japanese}</p>
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center gap-3">
              <ScoreBadge score={data.score} />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.score >= 90 ? '素晴らしい！' : data.score >= 70 ? 'よくできました' : data.score >= 50 ? 'もう少し！' : '頑張ろう'}
              </span>
            </div>

            {/* Answer comparison */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                解答比較
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <div className="px-4 py-3 flex gap-3">
                  <span className="shrink-0 mt-0.5 text-xs font-semibold text-gray-400 dark:text-gray-500 w-16">解答</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{data.userAnswer}</p>
                </div>
                <div className="px-4 py-3 flex gap-3 bg-emerald-50/60 dark:bg-emerald-950/30">
                  <span className="shrink-0 mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 w-16">模範解答</span>
                  <p className="text-sm font-medium leading-relaxed">{data.modelAnswer}</p>
                </div>
              </div>
            </div>

            {/* Corrections */}
            {data.corrections.length > 0 && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  修正ポイント
                </div>
                <ul className="divide-y divide-amber-100 dark:divide-amber-900">
                  {data.corrections.map((c, i) => (
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
                {data.feedback}
              </p>
            </div>

            {/* Pronunciation Note */}
            {data.pronunciationNote && (
              <div className="rounded-xl border border-purple-100 dark:border-purple-900 overflow-hidden">
                <div className="px-4 py-2 bg-purple-50 dark:bg-purple-950 text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                  発音メモ
                </div>
                <p className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {data.pronunciationNote}
                </p>
              </div>
            )}

            {/* CTA */}
            <a
              href="/"
              className="block w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors text-center"
            >
              自分もトレーニングする
            </a>
          </>
        )}
      </main>
    </div>
  )
}
