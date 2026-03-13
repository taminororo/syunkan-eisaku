import type { Level } from './types'

export const SITUATIONS = [
  '日常会話',
  'ビジネス・会議',
  '旅行・空港・ホテル',
  'レストラン・買い物',
  '学校・大学',
  'ニュース・時事',
  '自由テーマ',
] as const

export type Situation = (typeof SITUATIONS)[number]

export const SITUATION_ICONS: Record<Situation, string> = {
  '日常会話': '💬',
  'ビジネス・会議': '💼',
  '旅行・空港・ホテル': '✈️',
  'レストラン・買い物': '🍽️',
  '学校・大学': '📚',
  'ニュース・時事': '📰',
  '自由テーマ': '🎲',
}

export const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: 'beginner', label: '初級', desc: '中学英語レベル' },
  { value: 'intermediate', label: '中級', desc: '高校〜大学レベル' },
  { value: 'advanced', label: '上級', desc: '英検準1〜1級' },
]
