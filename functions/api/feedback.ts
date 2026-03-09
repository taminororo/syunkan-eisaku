import Anthropic from '@anthropic-ai/sdk'

interface Env {
  ANTHROPIC_API_KEY: string
}

interface RequestBody {
  japanese: string
  userAnswer: string
  inputMethod: 'text' | 'voice'
}

interface FeedbackPayload {
  score: number
  corrections: string[]
  modelAnswer: string
  feedback: string
  pronunciationNote?: string | null
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // ── 入力バリデーション ──────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = await context.request.json() as RequestBody
  } catch {
    return jsonResponse({ error: 'リクエストの形式が不正です' }, 400)
  }

  const { japanese, userAnswer, inputMethod } = body
  if (!japanese || !userAnswer || !inputMethod) {
    return jsonResponse({ error: '必須パラメータが不足しています' }, 400)
  }

  // ── API キー確認（値はログに出さない）──────────────────────────────────
  const apiKey = context.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY が設定されていません')
    return jsonResponse({ error: 'サービスが設定されていません。管理者にお問い合わせください。' }, 503)
  }

  // ── プロンプト組み立て ────────────────────────────────────────────────
  const isVoice = inputMethod === 'voice'
  const prompt = `あなたは英語学習の添削アシスタントです。以下の日本語文の英訳を採点・添削してください。

【日本語の問題文】
${japanese}

【学習者の解答】
${userAnswer}
${isVoice ? '\n（※この解答は音声入力で取得されました）' : ''}

以下のJSON形式のみで回答してください。JSONの前後に余分なテキストを含めないでください：
{
  "score": <0〜100の整数>,
  "corrections": [<修正ポイントの文字列の配列、なければ空配列>],
  "modelAnswer": "<自然で標準的な英語の模範解答>",
  "feedback": "<日本語で100文字程度の総合フィードバック>",
  "pronunciationNote": ${isVoice ? '"<音声入力の観点から気をつけるべき発音・区切りのコメント（日本語で50文字程度）>"' : 'null'}
}`

  // ── Anthropic API 呼び出し ────────────────────────────────────────────
  try {
    const client = new Anthropic({ apiKey })

    let rawJson = ''
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
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

    // ── JSON 抽出・パース ───────────────────────────────────────────────
    const jsonMatch = rawJson.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Claude response did not contain valid JSON')
      return jsonResponse({ error: '添削結果の解析に失敗しました' }, 502)
    }

    const parsed = JSON.parse(jsonMatch[0]) as FeedbackPayload

    const result = {
      score: parsed.score,
      corrections: parsed.corrections ?? [],
      modelAnswer: parsed.modelAnswer,
      feedback: parsed.feedback,
      pronunciationNote:
        parsed.pronunciationNote && parsed.pronunciationNote !== 'null'
          ? parsed.pronunciationNote
          : undefined,
    }

    return jsonResponse(result)
  } catch (e) {
    // APIキーやモデルの詳細はログのみ、ユーザーには安全なメッセージだけ返す
    console.error('Anthropic API error:', e instanceof Error ? e.message : 'Unknown error')
    return jsonResponse({ error: '添削中にエラーが発生しました。しばらくしてから再試行してください。' }, 500)
  }
}
