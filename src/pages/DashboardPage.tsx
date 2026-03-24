import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import type { DashboardData, WeakCategory } from '../types'
import { WEAK_CATEGORY_LABELS } from '../constants'
import { useAuth } from '../contexts/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'
import { fetchDashboardData } from '../api/client'
import { SunIcon, MoonIcon } from '../components/Icons'
import { LoginButton } from '../components/LoginButton'
import { UserMenu } from '../components/UserMenu'

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function DashboardPage() {
  const { dark, toggle: toggleDark } = useDarkMode()
  const { user, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    fetchDashboardData()
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'データの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [user, authLoading])

  const barData = data
    ? Object.entries(data.categoryCounts).map(([key, count]) => ({
        name: WEAK_CATEGORY_LABELS[key as WeakCategory] ?? key,
        count,
      })).sort((a, b) => b.count - a.count)
    : []

  const lineData = data
    ? data.recentScores.map((s, i) => ({
        label: `${i + 1}`,
        score: s.score,
      }))
    : []

  const textColor = getCssVar('--text-secondary')
  const gridColor = getCssVar('--border')
  const accentColor = getCssVar('--accent')
  const errorColor = getCssVar('--error')
  const tooltipBg = getCssVar('--bg-surface')

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary transition-colors">
      <header className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="font-bold text-lg tracking-tight font-display hover:opacity-70 transition-opacity">
            瞬間英作文
          </a>
          <div className="flex items-center gap-1">
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

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-bold font-display">弱点分析</h2>

        {(loading || authLoading) && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        {!authLoading && !user && (
          <div className="rounded-xl border border-border px-5 py-12 text-center space-y-4">
            <p className="text-text-secondary">弱点分析にはログインが必要です</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { window.location.href = '/api/auth/google' }}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
              >
                Google でログイン
              </button>
              <button
                onClick={() => { window.location.href = '/api/auth/github' }}
                className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-300 text-white dark:text-gray-900 text-sm font-semibold transition-colors"
              >
                GitHub でログイン
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-error bg-error-bg px-4 py-3">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border px-4 py-4 text-center">
                <p className="text-2xl font-bold font-display">{data.totalAnswers}</p>
                <p className="text-xs text-text-secondary mt-1">総回答数</p>
              </div>
              <div className="rounded-xl border border-border px-4 py-4 text-center">
                <p className="text-2xl font-bold font-display">{data.averageScore}<span className="text-sm font-normal">点</span></p>
                <p className="text-xs text-text-secondary mt-1">平均スコア</p>
              </div>
            </div>

            {/* Top 3 Weakest */}
            {data.topWeakCategories.length > 0 && (
              <div className="rounded-xl border border-error overflow-hidden">
                <div className="px-4 py-2 bg-error-bg text-xs font-semibold text-error uppercase tracking-wide">
                  苦手カテゴリ TOP{data.topWeakCategories.length}
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {data.topWeakCategories.map((cat, i) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-error-bg text-error"
                    >
                      <span className="text-xs font-bold">{i + 1}</span>
                      {WEAK_CATEGORY_LABELS[cat as WeakCategory] ?? cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bar Chart: Category Mistakes */}
            {barData.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-bg-secondary text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  カテゴリ別ミス回数
                </div>
                <div className="px-2 py-4">
                  <ResponsiveContainer width="100%" height={barData.length * 40 + 20}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis type="number" tick={{ fill: textColor, fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: textColor, fontSize: 12 }} width={60} />
                      <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: 'none', borderRadius: 8 }} />
                      <Bar dataKey="count" fill={errorColor} radius={[0, 4, 4, 0]} name="回数" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Line Chart: Score Trend */}
            {lineData.length > 1 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-bg-secondary text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  直近{lineData.length}回のスコア推移
                </div>
                <div className="px-2 py-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={lineData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: textColor, fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: 'none', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="score" stroke={accentColor} strokeWidth={2} dot={{ fill: accentColor, r: 4 }} name="スコア" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {data.totalAnswers === 0 && (
              <div className="rounded-xl border border-border px-5 py-10 text-center">
                <p className="text-text-secondary">まだ回答データがありません。トレーニングを始めましょう！</p>
                <a
                  href="/"
                  className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors"
                >
                  トレーニングを始める
                </a>
              </div>
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
