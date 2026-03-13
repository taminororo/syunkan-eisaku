import Anthropic from '@anthropic-ai/sdk'

interface Env {
  ANTHROPIC_API_KEY: string
}

interface RequestBody {
  situation: string
  level: 'beginner' | 'intermediate' | 'advanced'
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const levelDescriptions: Record<string, string> = {
  beginner: '中学英語レベル。短い文、基本的な語彙・文法',
  intermediate: '高校〜大学レベル。複文、慣用表現を含む',
  advanced: '英検準1級〜1級レベル。抽象的な話題、高度な語彙・構文',
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: RequestBody
  try {
    body = await context.request.json() as RequestBody
  } catch {
    return jsonResponse({ error: 'リクエストの形式が不正です' }, 400)
  }

  const { situation, level } = body
  if (!situation || !level) {
    return jsonResponse({ error: '必須パラメータが不足しています' }, 400)
  }

  const apiKey = context.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY が設定されていません')
    return jsonResponse({ error: 'サービスが設定されていません。管理者にお問い合わせください。' }, 503)
  }

  const situationText = situation === '自由テーマ'
    ? '特定のシチュエーションにとらわれず自由なテーマ'
    : situation

  const prompt = `あなたは英語学習用の問題作成アシスタントです。
瞬間英作文トレーニング用の日本語文を1問だけ生成してください。

【シチュエーション】${situationText}
【難易度】${levelDescriptions[level]}

条件：
- 自然な日本語で書く
- 英訳しやすい明確な文にする
- 難易度に厳密に従う
- シチュエーションに関連した内容にする
- 1文のみ（句点「。」または「？」で終わる）

以下のJSON形式のみで回答してください。JSONの前後に余分なテキストを含めないでください：
{"japanese": "<日本語の問題文>"}`

  try {
    const client = new Anthropic({ apiKey })

    let rawJson = ''
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        rawJson += chunk.delta.text
      }
    }

    const jsonMatch = rawJson.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Claude response did not contain valid JSON')
      return jsonResponse({ error: '問題の生成に失敗しました' }, 502)
    }

    const parsed = JSON.parse(jsonMatch[0]) as { japanese: string }
    if (!parsed.japanese) {
      return jsonResponse({ error: '問題の生成に失敗しました' }, 502)
    }

    return jsonResponse({ japanese: parsed.japanese })
  } catch (e) {
    console.error('Anthropic API error:', e instanceof Error ? e.message : 'Unknown error')
    return jsonResponse({ error: '問題の生成中にエラーが発生しました。しばらくしてから再試行してください。' }, 500)
  }
}
