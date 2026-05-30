import Anthropic from '@anthropic-ai/sdk'

interface Env {
  ANTHROPIC_API_KEY: string
}

interface RequestBody {
  situation: string
  level: 'beginner' | 'intermediate' | 'advanced'
  exclude?: string[]
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

  const { situation, level, exclude } = body
  if (!situation || !level) {
    return jsonResponse({ error: '必須パラメータが不足しています' }, 400)
  }

  const apiKey = context.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY が設定されていません')
    return jsonResponse({ error: 'サービスが設定されていません。管理者にお問い合わせください。' }, 503)
  }

  // 各カテゴリで「教科書的な例文」ではなく、その場面で実際に使う生きた表現が出るよう方針を補足する
  const situationDetails: Record<string, string> = {
    '日常会話':
      '家族・友人・同僚との日常のやりとり。予定の相談、体調や気分、ちょっとした頼みごとや愚痴、雑談など、ネイティブが実際の会話でそのまま使う自然でくだけた口語表現が登場する一文にすること',
    'ビジネス・会議':
      '職場の実務シーン。会議の進行、納期や見積もりの調整、進捗報告、クライアント対応、メールでの依頼・謝罪・催促など、実際のビジネスで日常的に使う表現が登場する一文にすること',
    '旅行・空港・ホテル':
      '海外旅行の実際の場面。チェックイン、搭乗・乗り継ぎ、ホテルの予約変更やトラブル対応、道や設備を尋ねる、荷物の紛失や遅延など、旅行者が現地でその場で口にする実用的な表現が登場する一文にすること',
    'レストラン・買い物':
      '飲食店や店舗でのリアルなやりとり。注文、アレルギーや要望の確認、おすすめを尋ねる、会計、返品・交換、サイズや在庫の確認など、客や店員が実際に使う表現が登場する一文にすること',
    '学校・大学':
      '学校・大学のリアルな日常。課題やレポートの提出、講義やグループワーク、試験勉強、教授や友人とのやりとり、進路や履修の相談など、学生が実際に使う表現が登場する一文にすること',
    'ニュース・時事':
      '実際のニュースや時事問題を話題にした一文。経済・環境・テクノロジー・社会・国際情勢などについて、ニュース記事や時事の議論で実際に使われる表現や言い回しが登場するようにすること',
    'IT・テクノロジー':
      'Web開発の実務に関するテーマ。英訳すると frontend / backend / API / デプロイ / プルリクエスト / マージ / バグ修正 / レビュー / レスポンシブ対応 / データベース / フレームワーク（React等）/ Git といった実際のWeb開発で使う語彙が自然に登場するような、エンジニア同士の会話や開発現場の一文にすること',
  }

  const situationText = situation === '自由テーマ'
    ? '特定のシチュエーションにとらわれず自由なテーマ'
    : situationDetails[situation] ?? situation

  const excludeSection = exclude && exclude.length > 0
    ? `\n【過去に出題済みの文（これらと同じ、または非常に似た文は避けてください）】\n${exclude.map(s => `- ${s}`).join('\n')}\n`
    : ''

  const prompt = `あなたは英語学習用の問題作成アシスタントです。
瞬間英作文トレーニング用の日本語文を1問だけ生成してください。

【シチュエーション】${situationText}
【難易度】${levelDescriptions[level]}
${excludeSection}
条件：
- 自然な日本語で書く
- 英訳しやすい明確な文にする
- 難易度に厳密に従う
- シチュエーションに関連した内容にする
- 1文のみ（句点「。」または「？」で終わる）
- 過去に出題済みの文と同じ内容や類似した文は絶対に生成しない

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
