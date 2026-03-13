import { useState } from 'react'
import type { Level } from '../types'
import { SITUATIONS, SITUATION_ICONS, LEVELS, type Situation } from '../constants'
import { CloseIcon } from './Icons'

interface SettingsModalProps {
  currentSituation: Situation
  currentLevel: Level
  onApply: (situation: Situation, level: Level) => void
  onCancel: () => void
}

export function SettingsModal({ currentSituation, currentLevel, onApply, onCancel }: SettingsModalProps) {
  const [situation, setSituation] = useState(currentSituation)
  const [level, setLevel] = useState(currentLevel)

  return (
    <div
      className="fixed inset-0 z-20 bg-black/60 flex items-end"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full rounded-t-2xl p-5 space-y-5 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">設定変更</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">シチュエーション</h4>
          <div className="grid grid-cols-2 gap-2">
            {SITUATIONS.map(s => (
              <button
                key={s}
                onClick={() => setSituation(s)}
                className={`py-2 px-3 rounded-xl text-sm font-medium text-left transition-colors
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
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">難易度</h4>
          <div className="flex gap-2">
            {LEVELS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setLevel(value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors
                  ${level === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onApply(situation, level)}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          変更して新しい問題へ
        </button>
      </div>
    </div>
  )
}
