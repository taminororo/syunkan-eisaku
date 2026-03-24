interface Env {
  RESULTS_KV: KVNamespace
  ASSETS: Fetcher
}

interface StoredResult {
  situation: string
  level: string
  score: number
}

const BOT_UA_PATTERNS = [
  'Twitterbot',
  'facebookexternalhit',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'WhatsApp',
  'LINE',
  'Googlebot',
]

const LEVEL_LABELS: Record<string, string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級',
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildOgpHtml(title: string, description: string, url: string, imageUrl: string): string {
  const t = escapeHtml(title)
  const d = escapeHtml(description)
  const u = escapeHtml(url)
  const img = escapeHtml(imageUrl)
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${t}</title>
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:type" content="article">
<meta property="og:image" content="${img}">
<meta property="og:site_name" content="瞬間英作文">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
</head>
<body></body>
</html>`
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userAgent = context.request.headers.get('User-Agent') ?? ''
  const isCrawler = BOT_UA_PATTERNS.some(p => userAgent.includes(p))

  if (!isCrawler) {
    return context.env.ASSETS.fetch(context.request)
  }

  const id = context.params.id as string
  const value = await context.env.RESULTS_KV.get(id)

  if (value === null) {
    return context.env.ASSETS.fetch(context.request)
  }

  const data = JSON.parse(value) as StoredResult
  const levelLabel = LEVEL_LABELS[data.level] ?? data.level
  const title = `Flash Compose｜${data.situation}（${levelLabel}）${data.score}点`
  const description = '瞬間英作文に挑戦しました！'
  const origin = new URL(context.request.url).origin
  const imageUrl = `${origin}/og-image.png`

  return new Response(buildOgpHtml(title, description, context.request.url, imageUrl), {
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  })
}
