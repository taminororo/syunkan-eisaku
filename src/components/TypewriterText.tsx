import { useState, useEffect } from 'react'

interface TypewriterTextProps {
  text: string
  className?: string
  delayPerWord?: number
}

export function TypewriterText({ text, className = '', delayPerWord = 50 }: TypewriterTextProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const words = text.split(/(\s+)/)

  useEffect(() => {
    setVisibleCount(0)
    const timer = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= words.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, delayPerWord)
    return () => clearInterval(timer)
  }, [text, words.length, delayPerWord])

  return (
    <p className={className}>
      {words.map((word, i) => (
        <span
          key={`${text}-${i}`}
          className={i < visibleCount ? 'animate-fade-in inline' : 'opacity-0 inline'}
          style={{ animationDuration: '150ms', animationDelay: '0ms' }}
        >
          {word}
        </span>
      ))}
    </p>
  )
}
