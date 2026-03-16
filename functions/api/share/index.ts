interface Env {
  RESULTS_KV: KVNamespace
}

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

  await context.env.RESULTS_KV.put(id, JSON.stringify(data), {
    expirationTtl: TTL_SECONDS,
  })

  return jsonResponse({ id })
}
