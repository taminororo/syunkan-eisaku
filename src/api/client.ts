import type { Level, FeedbackResult, SharedResult, User, DashboardData, ReviewItem } from '../types'
import type { Situation } from '../constants'

export async function fetchGenerateProblem(situation: Situation, level: Level, exclude: string[] = []): Promise<string> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ situation, level, exclude }),
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
  situation?: string,
  level?: string,
  elapsedMs?: number,
): Promise<FeedbackResult> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ japanese, userAnswer, inputMethod, situation, level, elapsedMs }),
  })
  const data = await res.json() as FeedbackResult & { error?: string }
  if (!res.ok) throw new Error(data.error ?? '添削に失敗しました')
  return {
    score: data.score,
    corrections: data.corrections ?? [],
    modelAnswer: data.modelAnswer,
    feedback: data.feedback,
    pronunciationNote: data.pronunciationNote,
    weakCategories: data.weakCategories ?? [],
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

export async function fetchMe(): Promise<User | null> {
  const res = await fetch('/api/auth/me')
  const data = await res.json() as { user: User | null }
  return data.user
}

export async function postLogout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' })
}

export async function fetchWebhook(): Promise<string | null> {
  const res = await fetch('/api/webhook')
  if (!res.ok) return null
  const data = await res.json() as { url: string | null }
  return data.url
}

export async function saveWebhook(url: string): Promise<void> {
  const res = await fetch('/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  const data = await res.json() as { error?: string }
  if (!res.ok) throw new Error(data.error ?? '通知設定の保存に失敗しました')
}

export async function deleteWebhook(): Promise<void> {
  await fetch('/api/webhook', { method: 'DELETE' })
}

export async function fetchReviewList(): Promise<ReviewItem[]> {
  const res = await fetch('/api/review')
  const data = await res.json() as { items?: ReviewItem[]; error?: string }
  if (!res.ok) throw new Error(data.error ?? '復習リストの取得に失敗しました')
  return data.items ?? []
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const res = await fetch('/api/history')
  const data = await res.json() as DashboardData & { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'データの取得に失敗しました')
  return data
}
