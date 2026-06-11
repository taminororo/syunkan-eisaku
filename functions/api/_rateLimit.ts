// 簡易レート制限（固定ウィンドウ方式）
//
// 未ログインでも課金API（generate/feedback/describe/transcribe）や共有保存を使えるようにしたまま、
// 「無制限ループでAnthropic/OpenAIの課金を枯渇させる」濫用を抑えるための仕組み。
//
// CF-Connecting-IP + エンドポイント名 + ウィンドウ開始時刻 をキーにして RESULTS_KV にカウントを持つ。
// ウィンドウ開始時刻をキーに含めるので、TTL による自動失効だけで古いカウンタが消え、リセット処理が要らない。
// KV は結合一貫性で高並列時にやや甘くなるが、本来の脅威（暴走ループの阻止）には十分。

export interface RateLimitResult {
  ok: boolean
  retryAfter?: number // 秒。ok:false のとき、次に試してよいまでの目安（Retry-Afterヘッダに使う）
}

export interface RateLimitOptions {
  limit: number      // 1ウィンドウあたりの許可回数
  windowSec: number  // ウィンドウの長さ（秒）
}

export async function checkRateLimit(
  kv: KVNamespace,
  request: Request,
  endpoint: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const windowMs = options.windowSec * 1000
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const key = `ratelimit:${ip}:${endpoint}:${windowStart}`

  const stored = await kv.get(key)
  const count = stored ? parseInt(stored, 10) : 0

  // 上限に達していれば、現ウィンドウ終了までの残り秒を添えて拒否する
  if (count >= options.limit) {
    const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000)
    return { ok: false, retryAfter }
  }

  // まだ余裕があるときだけカウンタを +1（弾いたリクエストは数えない＝ウィンドウを延長させない）
  await kv.put(key, String(count + 1), { expirationTtl: options.windowSec + 1 })
  return { ok: true }
}

// レート制限超過時に各エンドポイントが返す 429 レスポンス
export function tooManyRequests(result: RateLimitResult): Response {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (result.retryAfter !== undefined) headers['Retry-After'] = String(result.retryAfter)
  return new Response(
    JSON.stringify({ error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' }),
    { status: 429, headers },
  )
}
