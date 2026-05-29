// 通知（webhook）まわりの共有ロジック

export type WebhookProvider = 'discord' | 'slack'

// SSRF対策: サーバーからPOSTする先を Discord / Slack の公式webhookドメインに限定する
export function detectProvider(rawUrl: string): WebhookProvider | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null

  if (
    (url.hostname === 'discord.com' || url.hostname === 'discordapp.com') &&
    url.pathname.startsWith('/api/webhooks/')
  ) {
    return 'discord'
  }
  if (url.hostname === 'hooks.slack.com' && url.pathname.startsWith('/services/')) {
    return 'slack'
  }
  return null
}

export type WebhookValidation =
  | { ok: true; provider: WebhookProvider }
  | { ok: false; error: string }

export function validateWebhookUrl(rawUrl: string): WebhookValidation {
  const trimmed = rawUrl.trim()
  if (!trimmed) return { ok: false, error: 'URLを入力してください' }
  const provider = detectProvider(trimmed)
  if (!provider) {
    return { ok: false, error: 'Discord または Slack の Webhook URL を入力してください' }
  }
  return { ok: true, provider }
}

// Discord は { content }、Slack は { text } を期待する
export function webhookPayload(provider: WebhookProvider, text: string): Record<string, string> {
  return provider === 'discord' ? { content: text } : { text }
}

export function buildReminderMessage(): string {
  return '今日はまだ瞬間英作文を解いていません🔥1問だけでもやってみよう。'
}

/**
 * 「JSTでの今日0:00」を UTC のエポックミリ秒で返す。
 *
 * 履歴の timestamp は UTC(ISO文字列)で保存されているので、「JSTの当日に
 * 解いたか」を判定するには JST の0:00を UTC に直した境界が必要になる。
 *
 * 例: 2026-05-30 09:00 JST に実行 → 返すべきは 2026-05-30 00:00 JST。
 *     これは UTC では 2026-05-29 15:00（JSTは UTC+9 だから）。
 *
 * TODO(human): nowMs（現在の UTC エポックミリ秒）を受け取り、
 *   その瞬間が属する「JSTの日」の0:00を UTC エポックミリ秒で返す。
 *   ヒント:
 *     - JST は UTC+9。9 * 60 * 60 * 1000 ミリ秒ずらすと「JSTの壁時計」になる
 *     - ずらした時刻の年/月/日(UTC系メソッドで読む)から 0:00 を組み立て、
 *       最後に +9時間ぶんを引いて UTC へ戻す
 *     - Date.UTC(year, monthIndex, day) が 0:00 のエポックミリ秒を作るのに使える
 */
export function jstTodayStartUtcMs(nowMs: number): number {
  const JST_OFFSET = 9 * 60 * 60 * 1000
  // nowMs を JST の壁時計に直し、その年月日から JST 0:00 を組み立てて UTC へ戻す
  const jst = new Date(nowMs + JST_OFFSET)
  const jstMidnight = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate())
  return jstMidnight - JST_OFFSET
}
