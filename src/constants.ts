import type { Level, WeakCategory } from './types'

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

export const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: 'beginner', label: '初級', desc: '中学英語レベル' },
  { value: 'intermediate', label: '中級', desc: '高校〜大学レベル' },
  { value: 'advanced', label: '上級', desc: '英検準1〜1級' },
]

export const WEAK_CATEGORY_LABELS: Record<WeakCategory, string> = {
  articles: '冠詞',
  tense: '時制',
  word_order: '語順',
  prepositions: '前置詞',
  vocabulary: '語彙',
  spelling: 'スペル',
  plurals: '単複',
  conjunctions: '接続詞',
}
