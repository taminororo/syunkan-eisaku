import { MAX_USER_ANSWER_CHARS, MAX_USER_ANSWER_WORDS } from './constants'

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/** 入力中に 200 文字・50 語を超えないよう切り詰める */
export function clampUserAnswer(raw: string): string {
  let s = raw
  const words = s.trim().split(/\s+/).filter(Boolean)
  if (words.length > MAX_USER_ANSWER_WORDS) {
    s = words.slice(0, MAX_USER_ANSWER_WORDS).join(' ')
  }
  if (s.length > MAX_USER_ANSWER_CHARS) {
    s = s.slice(0, MAX_USER_ANSWER_CHARS)
  }
  return s
}
