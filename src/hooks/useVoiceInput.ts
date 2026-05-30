import { useState, useRef, useCallback } from 'react'
import type { VoiceState, UseVoiceInput } from '../types'
import { transcribeAudio } from '../api/client'

// このブラウザの MediaRecorder が対応し、かつ Whisper が受け付ける音声形式を選ぶ。
// 空文字を返した場合は MediaRecorder のブラウザ既定形式にフォールバックする。
function pickAudioMimeType(): string {
  // 優先順: webm/opus(Chrome・Firefox) → mp4(Safari) → ogg。いずれもWhisperが受理する。
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) ?? ''
}

function isSupported(): boolean {
  return typeof MediaRecorder !== 'undefined'
    && typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
}

export function useVoiceInput(): UseVoiceInput {
  const [supported] = useState(isSupported)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [finalText, setFinalText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    setError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('マイクにアクセスできませんでした。ブラウザの許可設定を確認してください。')
      setVoiceState('idle')
      return
    }
    streamRef.current = stream

    const mimeType = pickAudioMimeType()
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = async () => {
      stopTracks()
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      setVoiceState('transcribing')
      try {
        const text = await transcribeAudio(blob)
        setFinalText(text)
        setVoiceState('done')
      } catch (err) {
        setError(err instanceof Error ? err.message : '音声認識に失敗しました')
        setVoiceState('idle')
      }
    }

    recorderRef.current = recorder
    recorder.start()
    setVoiceState('recording')
  }, [stopTracks])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null // 変換を走らせずに録音を破棄する
      rec.stop()
    }
    stopTracks()
    recorderRef.current = null
    chunksRef.current = []
    setVoiceState('idle')
    setFinalText('')
    setError(null)
  }, [stopTracks])

  return { supported, voiceState, finalText, error, start, stop, reset }
}
