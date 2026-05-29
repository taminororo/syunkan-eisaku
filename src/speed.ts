// 速度（所要時間）まわりの表示ロジック

// ミリ秒を「12.3秒」のような短い表記にする
export function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}秒`
}

/**
 * 復習で「前回の所要時間」と「今回の所要時間」を比べ、
 * ユーザーに見せる短い速度コメントを返す。速くも遅くもない/比較不要なら null。
 *
 * TODO(human): prevMs と nowMs を比べてメッセージを組み立てる。
 *   - どれくらい差があれば「速くなった！」と言うか（しきい値）は自由に決めてよい
 *     （例: 0.5秒以上 / 10%以上 速ければ褒める、など）
 *   - 速くなった場合・遅くなった場合・ほぼ同じ場合の文言を決める
 *   - 差を出すなら formatDuration(Math.abs(prevMs - nowMs)) が使える
 *   - 表示する必要がないと判断したら null を返してよい
 */
const SPEED_THRESHOLD_MS = 300 // ±0.3秒未満は「ほぼ同じ」とみなしてコメントを出さない

export function speedComparisonMessage(prevMs: number, nowMs: number): string | null {
  const diff = prevMs - nowMs // 正: 速くなった / 負: 遅くなった
  if (Math.abs(diff) < SPEED_THRESHOLD_MS) return null
  if (diff > 0) return `⚡ ${formatDuration(diff)} 速くなった！`
  return `${formatDuration(-diff)} 遅くなった`
}
