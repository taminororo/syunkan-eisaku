export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950' :
    score >= 70 ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950' :
    score >= 50 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950' :
                  'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-2xl font-bold ${color}`}>
      {score}
      <span className="text-sm font-normal">点</span>
    </span>
  )
}
