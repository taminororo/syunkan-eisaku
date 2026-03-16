import type { Level, FeedbackResult, SharedResult } from '../types'
import type { Situation } from '../constants'

export async function fetchGenerateProblem(situation: Situation, level: Level): Promise<string> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ situation, level }),
  })
  const data = await res.json() as { japanese?: string; error?: string }
  if (!res.ok) throw new Error(data.error ?? '問題の生成に失敗しました')
  if (!data.japanese) throw new Error('問題の生成に失敗しました')
  return data.japanese
}

export async function fetchFeedback(
  japanese: string,
  userAnswer: string,
  inputMethod: 'text' | 'voice',
): Promise<FeedbackResult> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ japanese, userAnswer, inputMethod }),
  })
  const data = await res.json() as FeedbackResult & { error?: string }
  if (!res.ok) throw new Error(data.error ?? '添削に失敗しました')
  return {
    score: data.score,
    corrections: data.corrections ?? [],
    modelAnswer: data.modelAnswer,
    feedback: data.feedback,
    pronunciationNote: data.pronunciationNote,
  }
}

export async function postShare(payload: Omit<SharedResult, 'createdAt'>): Promise<string> {
  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json() as { id?: string; error?: string }
  if (!res.ok) throw new Error(data.error ?? '共有に失敗しました')
  if (!data.id) throw new Error('共有に失敗しました')
  return data.id
}
