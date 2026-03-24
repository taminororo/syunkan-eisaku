import { useState } from 'react'
import type { Level } from '../types'
import { SITUATIONS, SITUATION_ICONS, LEVELS, type Situation } from '../constants'
import { useAuth } from '../contexts/AuthContext'

interface SetupScreenProps {
  situation: Situation
  onSituationChange: (s: Situation) => void
  level: Level
  onLevelChange: (l: Level) => void
  onStart: () => void
}

export function SetupScreen({ situation, onSituationChange, level, onLevelChange, onStart }: SetupScreenProps) {
  const { user } = useAuth()
  const [selectedDesc, setSelectedDesc] = useState<string>(
    LEVELS.find(l => l.value === level)?.desc ?? ''
  )

  const handleLevelChange = (l: Level) => {
    onLevelChange(l)
    setSelectedDesc(LEVELS.find(lv => lv.value === l)?.desc ?? '')
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Situation cards */}
      <div className="space-y-3 animate-fade-in-up stagger-1">
        <h2 className="text-sm font-semibold text-text-secondary tracking-wide uppercase">
          シチュエーション
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SITUATIONS.map(s => {
            const selected = situation === s
            return (
              <button
                key={s}
                onClick={() => onSituationChange(s)}
                className={`group relative p-4 rounded-xl text-left transition-all
                  ${selected
                    ? 'bg-accent text-white shadow-md scale-[1.02] animate-card-select'
                    : 'bg-bg-surface border border-border text-text-primary hover:shadow-md hover:-translate-y-0.5'
                  }`}
                style={{ transitionDuration: 'var(--duration-normal)', transitionTimingFunction: 'var(--ease-default)' }}
              >
                <span className="text-2xl block mb-1.5">{SITUATION_ICONS[s]}</span>
                <span className="text-sm font-medium leading-tight">{s}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Difficulty segment control */}
      <div className="space-y-3 animate-fade-in-up stagger-2">
        <h2 className="text-sm font-semibold text-text-secondary tracking-wide uppercase">
          難易度
        </h2>
        <div className="relative flex rounded-xl bg-bg-secondary p-1 gap-1">
          {LEVELS.map(({ value, label }) => {
            const selected = level === value
            return (
              <button
                key={value}
                onClick={() => handleLevelChange(value)}
                className={`relative flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all z-10
                  ${selected
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                  }`}
                style={{ transitionDuration: 'var(--duration-normal)', transitionTimingFunction: 'var(--ease-default)' }}
              >
                {label}
              </button>
            )
          })}
        </div>
        {/* Animated description */}
        <p
          className="text-xs text-text-secondary text-center animate-fade-in"
          key={selectedDesc}
        >
          {selectedDesc}
        </p>
      </div>

      {/* Dashboard link */}
      <div className="w-full animate-fade-in-up stagger-3">
        {user ? (
          <a
            href="/dashboard"
            className="flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-center text-sm font-medium text-accent hover:bg-bg-secondary transition-colors"
          >
            弱点分析ダッシュボードを見る
          </a>
        ) : (
          <div className="rounded-xl border border-border px-4 py-3 text-center">
            <p className="text-xs text-text-secondary">
              <a href="/api/auth/google" className="text-accent hover:underline">ログイン</a>すると弱点分析が利用できます
            </p>
          </div>
        )}
      </div>

      {/* Sticky start button */}
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent">
        <div className="max-w-xl mx-auto">
          <button
            onClick={onStart}
            className="w-full py-4 rounded-xl bg-accent hover:bg-accent-hover text-white
              font-bold text-base shadow-lg transition-all
              active:scale-[0.98]"
            style={{ transitionDuration: 'var(--duration-fast)', transitionTimingFunction: 'var(--ease-bounce)' }}
          >
            スタート
          </button>
        </div>
      </div>
    </div>
  )
}
