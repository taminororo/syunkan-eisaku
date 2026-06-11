import { validateUserAnswer } from '../_userAnswerLimits'
import { checkRateLimit, tooManyRequests } from '../_rateLimit'

interface Env {
  RESULTS_KV: KVNamespace
}

// 1件あたりの保存サイズ上限（文字数）。未認証で書き込めるため濫用を抑える。
const MAX_SHARE_CHARS = 50_000

interface SharePayload {
  japanese: string
  userAnswer: string
  score: number
  modelAnswer: string
  corrections: string[]
  feedback: string
  pronunciationNote?: string
  situation: string
  level: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10)
}

const TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const rl = await checkRateLimit(context.env.RESULTS_KV, context.request, 'share', { limit: 10, windowSec: 60 })
  if (!rl.ok) return tooManyRequests(rl)

  let payload: SharePayload
  try {
    payload = await context.request.json() as SharePayload
  } catch {
    return jsonResponse({ error: 'リクエストの形式が不正です' }, 400)
  }

  const { japanese, userAnswer, score, modelAnswer, corrections, feedback, situation, level } = payload
  if (
    !japanese || !userAnswer || typeof score !== 'number' ||
    !modelAnswer || !Array.isArray(corrections) || !feedback ||
    !situation || !level
  ) {
    return jsonResponse({ error: '必須パラメータが不足しています' }, 400)
  }
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    return jsonResponse({ error: 'スコアが不正です' }, 400)
  }

  const answerLimit = validateUserAnswer(userAnswer)
  if (!answerLimit.ok) {
    return jsonResponse({ error: answerLimit.error }, 400)
  }

  const id = generateId()
  const data = {
    japanese,
    userAnswer,
    score,
    modelAnswer,
    corrections,
    feedback,
    pronunciationNote: payload.pronunciationNote ?? null,
    situation,
    level,
    createdAt: new Date().toISOString(),
  }

  const serialized = JSON.stringify(data)
  if (serialized.length > MAX_SHARE_CHARS) {
    return jsonResponse({ error: 'データが大きすぎます' }, 400)
  }

  await context.env.RESULTS_KV.put(id, serialized, {
    expirationTtl: TTL_SECONDS,
  })

  return jsonResponse({ id })
}
