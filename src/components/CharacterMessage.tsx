import { TEACHER_NAME } from '../character'

interface Props {
  text: string
}

// 先生キャラのセリフを名前つき吹き出しで表示する（アバター無し）
export function CharacterMessage({ text }: Props) {
  return (
    <div className="rounded-2xl border border-accent-border bg-accent-bg px-4 py-3">
      <p className="text-xs font-semibold text-accent mb-1">🌱 {TEACHER_NAME}</p>
      <p className="text-sm text-text-primary leading-relaxed">{text}</p>
    </div>
  )
}
