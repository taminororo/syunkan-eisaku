import type { Level } from '../types'

export function LevelBadge({ level }: { level: Level }) {
  const map: Record<Level, { label: string; cls: string }> = {
    beginner: { label: '初級', cls: 'bg-success-bg text-success' },
    intermediate: { label: '中級', cls: 'bg-warning-bg text-warning' },
    advanced: { label: '上級', cls: 'bg-error-bg text-error' },
  }
  const { label, cls } = map[level]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  )
}
