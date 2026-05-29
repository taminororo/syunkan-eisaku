import type { Env } from './_env'
import { getSessionUser } from './_auth'
import { validateWebhookUrl } from './_notify'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function webhookKey(userId: string): string {
  return `user:${userId}:webhook`
}

// 現在登録されている通知用 Webhook URL を返す
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getSessionUser(context.request, context.env.RESULTS_KV)
  if (!user) return jsonResponse({ error: 'ログインが必要です' }, 401)

  const url = await context.env.RESULTS_KV.get(webhookKey(user.id))
  return jsonResponse({ url: url ?? null })
}

// Webhook URL を登録/更新する（Discord/Slack のみ許可）
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = await getSessionUser(context.request, context.env.RESULTS_KV)
  if (!user) return jsonResponse({ error: 'ログインが必要です' }, 401)

  let body: { url?: string }
  try {
    body = await context.request.json() as { url?: string }
  } catch {
    return jsonResponse({ error: 'リクエストの形式が不正です' }, 400)
  }

  const validation = validateWebhookUrl(body.url ?? '')
  if (!validation.ok) return jsonResponse({ error: validation.error }, 400)

  await context.env.RESULTS_KV.put(webhookKey(user.id), (body.url ?? '').trim())
  return jsonResponse({ url: (body.url ?? '').trim(), provider: validation.provider })
}

// 登録を解除する
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const user = await getSessionUser(context.request, context.env.RESULTS_KV)
  if (!user) return jsonResponse({ error: 'ログインが必要です' }, 401)

  await context.env.RESULTS_KV.delete(webhookKey(user.id))
  return jsonResponse({ url: null })
}
