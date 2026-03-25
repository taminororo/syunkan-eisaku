import { useEffect } from 'react'
import type { UseVoiceInput } from '../types'
import { MAX_USER_ANSWER_CHARS } from '../constants'
import { clampUserAnswer } from '../userAnswerLimits'
import { UserAnswerHint } from './UserAnswerHint'
import { MicIcon, StopIcon } from './Icons'

interface VoiceInputPanelProps {
  voice: UseVoiceInput
  editedText: string
  onEditedTextChange: (t: string) => void
  onSubmit: () => void
  loading: boolean
}

export function VoiceInputPanel({ voice, editedText, onEditedTextChange, onSubmit, loading }: VoiceInputPanelProps) {
  const { supported, voiceState, interimText, finalText, start, stop, reset } = voice

  // Sync finalText → editedText when voice finishes
  useEffect(() => {
    if (voiceState === 'done') {
      onEditedTextChange(clampUserAnswer(finalText))
    }
  }, [voiceState, finalText, onEditedTextChange])

  if (!supported) {
    return (
      <div className="rounded-xl border border-border p-6 text-center text-sm text-text-secondary">
        このブラウザは音声入力に対応していません。<br />テキスト入力をご利用ください。
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Recording area */}
      <div className="rounded-xl border border-border min-h-[100px] p-4 text-sm relative">
        {voiceState === 'idle' && !editedText && (
          <span className="text-text-secondary">マイクボタンで録音を開始してください</span>
        )}
        {voiceState === 'recording' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-error animate-pulse" />
              <span className="text-xs text-error font-medium">録音中…</span>
            </div>
            <p className="text-text-primary">{finalText}</p>
            {interimText && (
              <p className="text-text-secondary italic">{interimText}</p>
            )}
          </div>
        )}
        {voiceState === 'done' && (
          <>
            <textarea
              value={editedText}
              onChange={e => onEditedTextChange(clampUserAnswer(e.target.value))}
              className="w-full h-full bg-transparent text-text-primary resize-none focus:outline-none text-sm"
              rows={4}
              maxLength={MAX_USER_ANSWER_CHARS}
              placeholder="認識結果を編集できます"
            />
            <UserAnswerHint value={editedText} />
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {voiceState === 'idle' && (
          <button
            onClick={start}
            className="flex-1 py-3 rounded-xl bg-error hover:brightness-110 text-white
              font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <MicIcon className="w-4 h-4" />
            録音開始
          </button>
        )}

        {voiceState === 'recording' && (
          <button
            onClick={stop}
            className="flex-1 py-3 rounded-xl bg-bg-secondary text-text-primary hover:brightness-95 dark:hover:brightness-110
              font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <StopIcon className="w-4 h-4" />
            録音停止
          </button>
        )}

        {voiceState === 'done' && (
          <>
            <button
              onClick={reset}
              className="py-3 px-4 rounded-xl border border-border
                text-text-primary font-medium text-sm hover:bg-bg-secondary
                transition-colors flex items-center gap-1.5"
            >
              <MicIcon className="w-4 h-4" />
              再録音
            </button>
            <button
              onClick={onSubmit}
              disabled={!editedText.trim() || loading}
              className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40
                text-white font-semibold text-sm transition-colors"
            >
              {loading ? '添削中…' : '送信'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
