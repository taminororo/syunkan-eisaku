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

  const textColor = dark ? '#9ca3af' : '#6b7280'
  const gridColor = dark ? '#374151' : '#e5e7eb'

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="font-bold text-lg tracking-tight hover:opacity-70 transition-opacity">
            瞬間英作文
          </a>
          <div className="flex items-center gap-1">
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

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h2 className="text-xl font-bold">弱点分析</h2>

        {(loading || authLoading) && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        )}

        {!authLoading && !user && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-12 text-center space-y-4">
            <p className="text-gray-500 dark:text-gray-400">弱点分析にはログインが必要です</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => { window.location.href = '/api/auth/google' }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
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
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-4 text-center">
                <p className="text-2xl font-bold">{data.totalAnswers}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">総回答数</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-4 text-center">
                <p className="text-2xl font-bold">{data.averageScore}<span className="text-sm font-normal">点</span></p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">平均スコア</p>
              </div>
            </div>

            {/* Top 3 Weakest */}
            {data.topWeakCategories.length > 0 && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
                <div className="px-4 py-2 bg-red-50 dark:bg-red-950 text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
                  苦手カテゴリ TOP{data.topWeakCategories.length}
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {data.topWeakCategories.map((cat, i) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
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
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  カテゴリ別ミス回数
                </div>
                <div className="px-2 py-4">
                  <ResponsiveContainer width="100%" height={barData.length * 40 + 20}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis type="number" tick={{ fill: textColor, fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: textColor, fontSize: 12 }} width={60} />
                      <Tooltip contentStyle={{ backgroundColor: dark ? '#1f2937' : '#fff', border: 'none', borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="回数" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Line Chart: Score Trend */}
            {lineData.length > 1 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  直近{lineData.length}回のスコア推移
                </div>
                <div className="px-2 py-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={lineData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: textColor, fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: dark ? '#1f2937' : '#fff', border: 'none', borderRadius: 8 }} />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="スコア" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {data.totalAnswers === 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-10 text-center">
                <p className="text-gray-500 dark:text-gray-400">まだ回答データがありません。トレーニングを始めましょう！</p>
                <a
                  href="/"
                  className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  トレーニングを始める
                </a>
              </div>
            )}
          </>
        )}

        <a
          href="/"
          className="block w-full py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold text-sm transition-colors text-center hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          トレーニングに戻る
        </a>
      </main>
    </div>
  )
}
