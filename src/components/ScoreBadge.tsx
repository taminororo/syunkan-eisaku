import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useCountUp } from '../hooks/useCountUp'

interface ScoreBadgeProps {
  score: number
  animate?: boolean
}

const PRAISE: Record<string, string> = {
  excellent: 'Excellent!',
  great: 'Great!',
}

export function ScoreBadge({ score, animate = true }: ScoreBadgeProps) {
  const displayScore = animate ? useCountUp(score, 800) : score
  const firedRef = useRef(false)

  useEffect(() => {
    if (animate && score >= 80 && displayScore >= score && !firedRef.current) {
      firedRef.current = true
      confetti({
        particleCount: score >= 90 ? 80 : 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#e94560', '#2ecc71', '#f39c12', '#3498db'],
        disableForReducedMotion: true,
      })
    }
  }, [animate, score, displayScore])

  // Reset ref when score changes
  useEffect(() => {
    firedRef.current = false
  }, [score])

  const color =
    score >= 90 ? 'text-success bg-success-bg' :
    score >= 70 ? 'text-accent bg-accent-bg' :
    score >= 50 ? 'text-warning bg-warning-bg' :
                  'text-error bg-error-bg'

  const praise = score >= 90 ? PRAISE.excellent : score >= 80 ? PRAISE.great : null

  return (
    <div className={`inline-flex items-center gap-2 ${animate ? 'animate-score-pop' : ''}`}>
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-2xl font-bold font-display ${color}`}>
        {displayScore}
        <span className="text-sm font-normal">点</span>
      </span>
      {praise && (
        <span className="text-sm font-bold font-display text-accent animate-scale-in">
          {praise}
        </span>
      )}
    </div>
  )
}
