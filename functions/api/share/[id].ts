interface Env {
  RESULTS_KV: KVNamespace
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  if (!id) {
    return jsonResponse({ error: 'IDが指定されていません' }, 400)
  }

  const value = await context.env.RESULTS_KV.get(id)
  if (value === null) {
    return jsonResponse({ error: '共有結果が見つかりません（期限切れか無効なIDです）' }, 404)
  }

  try {
    const data = JSON.parse(value) as unknown
    return jsonResponse(data)
  } catch {
    return jsonResponse({ error: 'データの読み込みに失敗しました' }, 502)
  }
}
