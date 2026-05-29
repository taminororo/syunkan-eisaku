import { useEffect, useState } from 'react'
import { fetchWebhook, saveWebhook, deleteWebhook } from '../api/client'

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function NotificationSettings() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [registered, setRegistered] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchWebhook().then(saved => {
      if (cancelled || !saved) return
      setUrl(saved)
      setRegistered(true)
    })
    return () => { cancelled = true }
  }, [])

  const handleSave = async () => {
    setStatus('saving')
    setError(null)
    try {
      await saveWebhook(url.trim())
      setRegistered(true)
      setStatus('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
      setStatus('error')
    }
  }

  const handleDelete = async () => {
    await deleteWebhook()
    setUrl('')
    setRegistered(false)
    setStatus('idle')
  }

  return (
    <div className="w-full rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
      >
        <span>🔔 サボり防止通知 {registered && <span className="text-success">（設定済み）</span>}</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3 border-t border-border animate-fade-in">
          <p className="text-xs text-text-secondary leading-relaxed">
            その日まだ解いていないと、毎朝9時に Discord / Slack へリマインドを送ります。
            通知先の Webhook URL を登録してください。
          </p>
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setStatus('idle') }}
            placeholder="https://discord.com/api/webhooks/... または https://hooks.slack.com/services/..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm
              focus:outline-none focus-ring-animate placeholder:text-text-secondary"
          />
          {error && <p className="text-xs text-error">{error}</p>}
          {status === 'saved' && <p className="text-xs text-success">保存しました</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!url.trim() || status === 'saving'}
              className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-semibold transition-colors"
            >
              {status === 'saving' ? '保存中…' : '保存'}
            </button>
            {registered && (
              <button
                onClick={handleDelete}
                className="py-2 px-4 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg-secondary text-sm font-medium transition-colors"
              >
                解除
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
