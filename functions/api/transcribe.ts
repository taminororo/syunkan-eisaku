import type { Env } from './_env'

// Whisper の上限は 25MB。それを超える音声は事前に弾く。
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// 録音した音声を受け取り、OpenAI Whisper でテキストに変換して返す。
// ブラウザから OpenAI を直接叩くとキーが露出するため、必ずこのサーバーを経由させる。
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('OPENAI_API_KEY が設定されていません')
    return jsonResponse({ error: 'サービスが設定されていません。管理者にお問い合わせください。' }, 503)
  }

  let form: FormData
  try {
    form = await context.request.formData()
  } catch {
    return jsonResponse({ error: 'リクエストの形式が不正です' }, 400)
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return jsonResponse({ error: '音声データがありません' }, 400)
  }
  if (file.size === 0) {
    return jsonResponse({ error: '音声データが空です' }, 400)
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return jsonResponse({ error: '音声が長すぎます。短く録音し直してください。' }, 413)
  }

  const upstream = new FormData()
  upstream.append('file', file, file.name || 'audio.webm')
  upstream.append('model', 'whisper-1')
  upstream.append('language', 'en') // 瞬間英作文の解答は英語前提

  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('Whisper API error:', res.status, detail)
      return jsonResponse({ error: '音声認識に失敗しました' }, 502)
    }

    const data = await res.json() as { text?: string }
    return jsonResponse({ text: data.text ?? '' })
  } catch (e) {
    console.error('Whisper request failed:', e instanceof Error ? e.message : 'Unknown error')
    return jsonResponse({ error: '音声認識中にエラーが発生しました。しばらくしてから再試行してください。' }, 500)
  }
}
