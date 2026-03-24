export function WaveDotsLoader() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="wave-dot inline-block w-2 h-2 rounded-full bg-accent"
        />
      ))}
    </span>
  )
}
