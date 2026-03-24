import type { Env } from './_env'
import { getSessionUser } from './_auth'

interface WeakCategoryEntry {
  category: string
  severity: 'minor' | 'major'
}

interface HistorySummary {
  score: number
  weakCategories: WeakCategoryEntry[]
  situation: string
  level: string
  timestamp: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getSessionUser(context.request, context.env.RESULTS_KV)
  if (!user) {
    return jsonResponse({ error: 'ログインが必要です' }, 401)
  }

  const historyKey = `user:${user.id}:history`
  const raw = await context.env.RESULTS_KV.get(historyKey)
  const history: HistorySummary[] = raw ? JSON.parse(raw) as HistorySummary[] : []

  const totalAnswers = history.length
  const averageScore = totalAnswers > 0
    ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / totalAnswers)
    : 0

  // Category counts
  const categoryCounts: Record<string, number> = {}
  for (const entry of history) {
    for (const wc of entry.weakCategories) {
      categoryCounts[wc.category] = (categoryCounts[wc.category] ?? 0) + 1
    }
  }

  // Recent 10 scores
  const recentScores = history.slice(-10).map(h => ({
    score: h.score,
    timestamp: h.timestamp,
  }))

  // Top 3 weakest categories
  const sorted = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category)

  return jsonResponse({
    totalAnswers,
    averageScore,
    categoryCounts,
    recentScores,
    topWeakCategories: sorted,
  })
}
