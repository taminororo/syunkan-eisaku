import type { Env } from '../_env'
import {
  detectProvider,
  webhookPayload,
  buildReminderMessage,
  jstTodayStartUtcMs,
} from '../_notify'

interface HistoryEntry {
  timestamp: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// 外部スケジューラ(GitHub Actions)から毎朝叩かれる。
// その日(JST)まだ解いていない & webhook登録済みのユーザーへ通知する。
export const onRequestPost: PagesFunction<Env> = async (context) => {
  // ── 認証: CRON_SECRET と一致しなければ拒否 ──
  const provided = context.request.headers.get('X-Cron-Secret') ?? ''
  if (!context.env.CRON_SECRET || provided !== context.env.CRON_SECRET) {
    return jsonResponse({ error: 'unauthorized' }, 401)
  }

  const kv = context.env.RESULTS_KV
  const todayStart = jstTodayStartUtcMs(Date.now())
  const message = buildReminderMessage()

  let notified = 0
  let skipped = 0
  let failed = 0

  // user:*:webhook をページングしながら全件走査
  let cursor: string | undefined = undefined
  do {
    const list = await kv.list({ prefix: 'user:', cursor })
    cursor = list.list_complete ? undefined : list.cursor

    for (const key of list.keys) {
      if (!key.name.endsWith(':webhook')) continue

      const userId = key.name.slice('user:'.length, -':webhook'.length)
      const url = await kv.get(key.name)
      if (!url) continue
      const provider = detectProvider(url)
      if (!provider) { skipped++; continue }

      // 当日(JST)に1件でも履歴があればスキップ
      const rawHistory = await kv.get(`user:${userId}:history`)
      const history: HistoryEntry[] = rawHistory ? JSON.parse(rawHistory) as HistoryEntry[] : []
      const activeToday = history.some(h => Date.parse(h.timestamp) >= todayStart)
      if (activeToday) { skipped++; continue }

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload(provider, message)),
        })
        if (res.ok) notified++
        else failed++
      } catch {
        failed++
      }
    }
  } while (cursor)

  return jsonResponse({ notified, skipped, failed })
}
