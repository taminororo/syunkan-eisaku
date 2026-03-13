import { useEffect } from 'react'
import type { UseVoiceInput } from '../types'
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
      onEditedTextChange(finalText)
    }
  }, [voiceState, finalText, onEditedTextChange])

  if (!supported) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-400 dark:text-gray-500">
        このブラウザは音声入力に対応していません。<br />テキスト入力をご利用ください。
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Recording area */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 min-h-[100px] p-4 text-sm relative">
        {voiceState === 'idle' && !editedText && (
          <span className="text-gray-400 dark:text-gray-500">マイクボタンで録音を開始してください</span>
        )}
        {voiceState === 'recording' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-500 dark:text-red-400 font-medium">録音中…</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">{finalText}</p>
            {interimText && (
              <p className="text-gray-400 dark:text-gray-500 italic">{interimText}</p>
            )}
          </div>
        )}
        {voiceState === 'done' && (
          <textarea
            value={editedText}
            onChange={e => onEditedTextChange(e.target.value)}
            className="w-full h-full bg-transparent text-gray-900 dark:text-white resize-none focus:outline-none text-sm"
            rows={4}
            placeholder="認識結果を編集できます"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {voiceState === 'idle' && (
          <button
            onClick={start}
            className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white
              font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <MicIcon className="w-4 h-4" />
            録音開始
          </button>
        )}

        {voiceState === 'recording' && (
          <button
            onClick={stop}
            className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white
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
              className="py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700
                text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50
                dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            >
              <MicIcon className="w-4 h-4" />
              再録音
            </button>
            <button
              onClick={onSubmit}
              disabled={!editedText.trim() || loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40
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
