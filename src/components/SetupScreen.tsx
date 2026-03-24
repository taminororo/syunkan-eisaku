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

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">シチュエーション</h2>
        <div className="grid grid-cols-2 gap-2">
          {SITUATIONS.map(s => (
            <button
              key={s}
              onClick={() => onSituationChange(s)}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium text-left transition-colors
                ${situation === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              {SITUATION_ICONS[s]} {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">難易度</h2>
        <div className="space-y-2">
          {LEVELS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => onLevelChange(value)}
              className={`w-full py-3 px-4 rounded-xl text-left transition-colors flex items-center justify-between
                ${level === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <span className="font-semibold text-sm">{label}</span>
              <span className={`text-xs ${level === value ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                {desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
      >
        スタート
      </button>

      {/* Dashboard link */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
        {user ? (
          <a
            href="/dashboard"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            弱点分析ダッシュボードを見る
          </a>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            <a href="/api/auth/google" className="text-blue-500 hover:underline">ログイン</a>すると弱点分析が利用できます
          </p>
        )}
      </div>
    </div>
  )
}
