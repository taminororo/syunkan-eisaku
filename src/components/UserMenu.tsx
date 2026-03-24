import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-bg-secondary transition-colors"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
            {user.nickname.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium text-text-primary max-w-[80px] truncate">
          {user.nickname}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-bg-surface shadow-lg z-30 overflow-hidden">
            <a
              href="/dashboard"
              className="block w-full px-4 py-3 text-left text-sm hover:bg-bg-secondary transition-colors"
            >
              弱点分析
            </a>
            <button
              onClick={async () => { await logout(); setOpen(false) }}
              className="w-full px-4 py-3 text-left text-sm text-error hover:bg-bg-secondary transition-colors border-t border-border"
            >
              ログアウト
            </button>
          </div>
        </>
      )}
    </div>
  )
}
