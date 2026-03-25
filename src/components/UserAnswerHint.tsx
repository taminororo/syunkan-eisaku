import { MAX_USER_ANSWER_CHARS, MAX_USER_ANSWER_WORDS } from '../constants'
import { countWords } from '../userAnswerLimits'

export function UserAnswerHint({ value }: { value: string }) {
  return (
    <p className="text-xs text-text-secondary mt-1">
      {value.length}/{MAX_USER_ANSWER_CHARS} 文字 · {countWords(value)}/{MAX_USER_ANSWER_WORDS} 語
    </p>
  )
}
