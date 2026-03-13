import type { Level } from '../types'

export function LevelBadge({ level }: { level: Level }) {
  const map: Record<Level, { label: string; cls: string }> = {
    beginner: { label: '初級', cls: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    intermediate: { label: '中級', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    advanced: { label: '上級', cls: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  }
  const { label, cls } = map[level]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  )
}
