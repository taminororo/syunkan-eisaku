import type { Env } from './_env'
import { getSessionUser } from './_auth'

interface WeakCategoryEntry {
  category: string
  severity: 'minor' | 'major'
}

interface HistorySummary {
  japanese?: string
  score: number
  elapsedMs?: number
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

  // japanese を保存する前の古いエントリは復習できないので除外する。
  // 新しい順に並べて返す（KVは古い順に push されている）。
  const items = history
    .filter((h): h is HistorySummary & { japanese: string } => Boolean(h.japanese))
    .map(h => ({
      japanese: h.japanese,
      score: h.score,
      elapsedMs: h.elapsedMs,
      situation: h.situation,
      level: h.level,
      timestamp: h.timestamp,
    }))
    .reverse()

  return jsonResponse({ items })
}
