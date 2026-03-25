/** src/constants.ts の MAX_USER_ANSWER_* と同じ値に揃えること */
export const MAX_USER_ANSWER_CHARS = 200
export const MAX_USER_ANSWER_WORDS = 50

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

export function validateUserAnswer(raw: string): { ok: true } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (trimmed.length > MAX_USER_ANSWER_CHARS) {
    return { ok: false, error: `解答は${MAX_USER_ANSWER_CHARS}文字以内にしてください` }
  }
  if (countWords(trimmed) > MAX_USER_ANSWER_WORDS) {
    return { ok: false, error: `解答は${MAX_USER_ANSWER_WORDS}語以内にしてください` }
  }
  return { ok: true }
}
