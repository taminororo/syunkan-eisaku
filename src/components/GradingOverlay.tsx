import { useState, useEffect } from 'react'
import { WaveDotsLoader } from './WaveDotsLoader'

const MESSAGES = [
  '文法をチェック中',
  '語彙を評価中',
  'フィードバックを作成中',
]

export function GradingOverlay() {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % MESSAGES.length)
    }, 800)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="rounded-2xl border border-border bg-bg-surface px-5 py-16 flex flex-col items-center gap-5 animate-fade-in">
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center">
          <WaveDotsLoader />
        </div>
        <div
          className="absolute inset-0 rounded-full border-2 border-accent"
          style={{ animation: 'pulse-ring 1.5s ease-out infinite' }}
        />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-text-primary animate-fade-in" key={msgIndex}>
          {MESSAGES[msgIndex]}...
        </p>
        <p className="text-xs text-text-secondary">AIが添削しています</p>
      </div>
    </div>
  )
}
