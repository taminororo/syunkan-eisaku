import Anthropic from '@anthropic-ai/sdk'
import type { Env } from './_env'
import { validateUserAnswer } from './_userAnswerLimits'

// scenes.ts と一致させる許可リスト（任意URLへのアクセスを防ぐ）
const ALLOWED_SCENE_IDS = ['cafe', 'airport', 'meeting', 'conversation', 'classroom', 'news', 'park']

interface RequestBody {
  sceneId: string
  userAnswer: string
}

interface WeakCategoryEntry {
  category: string
  severity: 'minor' | 'major'
}

interface FeedbackPayload {
  score: number
  corrections: string[]
  modelAnswer: string
  feedback: string
  weakCategories?: WeakCategoryEntry[]
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ArrayBuffer → base64（大きい配列でもスタックを溢れさせない）
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: RequestBody
  try {
    body = await context.request.json() as RequestBody
  } catch {
    return jsonResponse({ error: 'リクエストの形式が不正です' }, 400)
  }

  const { sceneId, userAnswer } = body
  if (!sceneId || !userAnswer) {
    return jsonResponse({ error: '必須パラメータが不足しています' }, 400)
  }
  if (!ALLOWED_SCENE_IDS.includes(sceneId)) {
    return jsonResponse({ error: '不明な場面です' }, 400)
  }
  const validation = validateUserAnswer(userAnswer)
  if (!validation.ok) {
    return jsonResponse({ error: validation.error }, 400)
  }
  const answerText = userAnswer.trim()

  const apiKey = context.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY が設定されていません')
    return jsonResponse({ error: 'サービスが設定されていません。' }, 503)
  }

  // 同一デプロイの静的画像を取得して base64 化
  let imageBase64: string
  try {
    const imgUrl = new URL(`/scenes/${sceneId}.jpg`, context.request.url)
    const imgRes = await fetch(imgUrl.toString())
    if (!imgRes.ok) throw new Error(`image fetch failed: ${imgRes.status}`)
    imageBase64 = toBase64(await imgRes.arrayBuffer())
  } catch (e) {
    console.error('scene image fetch error:', e instanceof Error ? e.message : 'unknown')
    return jsonResponse({ error: '画像の読み込みに失敗しました' }, 502)
  }

  const prompt = `あなたは英語学習のやさしい先生です。学習者が「下の画像の状況を英語で描写」しました。画像を見て、その描写を採点・添削してください。

【学習者の描写】
${answerText}

評価の方針:
- 画像の内容を正しく・自然な英語で描写できているかを最重視する
- 文法・語彙・自然さも見る
- 唯一の正解はない。場面の主要な要素を捉えていれば高く評価してよい

以下のJSON形式のみで回答してください。JSONの前後に余分なテキストを含めないでください：
{
  "score": <0〜100の整数>,
  "corrections": [<修正ポイントの文字列の配列、なければ空配列>],
  "modelAnswer": "<その画像の自然な英語描写の例。2〜3文>",
  "feedback": "<やさしく励ます先生口調で、日本語100文字程度の総合フィードバック。まず良かった点を具体的に褒め、次に活かせるアドバイスを1つ温かく添える>",
  "weakCategories": [<該当する弱点カテゴリの配列。各要素は {"category": "<カテゴリ>", "severity": "<minor|major>"} 形式。カテゴリは articles(冠詞), tense(時制), word_order(語順), prepositions(前置詞), vocabulary(語彙), spelling(スペル), plurals(単複), conjunctions(接続詞) のいずれか。間違いがなければ空配列>]
}`

  try {
    const client = new Anthropic({ apiKey })
    let rawJson = ''
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: prompt },
        ],
      }],
    })
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        rawJson += chunk.delta.text
      }
    }

    const jsonMatch = rawJson.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Claude response did not contain valid JSON')
      return jsonResponse({ error: '採点結果の解析に失敗しました' }, 502)
    }
    const parsed = JSON.parse(jsonMatch[0]) as FeedbackPayload

    return jsonResponse({
      score: parsed.score,
      corrections: parsed.corrections ?? [],
      modelAnswer: parsed.modelAnswer,
      feedback: parsed.feedback,
      weakCategories: parsed.weakCategories ?? [],
    })
  } catch (e) {
    console.error('Anthropic API error:', e instanceof Error ? e.message : 'Unknown error')
    return jsonResponse({ error: '採点中にエラーが発生しました。しばらくしてから再試行してください。' }, 500)
  }
}
