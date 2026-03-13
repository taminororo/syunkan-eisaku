import { useState, useRef, useCallback } from 'react'
import type {
  ISpeechRecognition,
  ISpeechRecognitionEvent,
  SpeechRecognitionCtor,
  VoiceState,
  UseVoiceInput,
} from '../types'

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useVoiceInput(): UseVoiceInput {
  const [supported] = useState(() => getSpeechRecognitionCtor() !== null)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  const start = useCallback(() => {
    const SR = getSpeechRecognitionCtor()
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false

    rec.onstart = () => setVoiceState('recording')
    rec.onresult = (e: ISpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      setInterimText(interim)
      if (final) setFinalText(prev => (prev + ' ' + final).trim())
    }
    rec.onend = () => {
      setInterimText('')
      setVoiceState('done')
    }
    rec.onerror = () => {
      setInterimText('')
      setVoiceState('idle')
    }

    recognitionRef.current = rec
    rec.start()
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    recognitionRef.current?.abort()
    setVoiceState('idle')
    setInterimText('')
    setFinalText('')
  }, [])

  return { supported, voiceState, interimText, finalText, start, stop, reset }
}
