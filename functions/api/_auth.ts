export interface SessionUser {
  id: string
  nickname: string
  avatarUrl: string
  provider: 'google' | 'github'
}

export async function getSessionUser(
  request: Request,
  kv: KVNamespace,
): Promise<SessionUser | null> {
  const cookie = request.headers.get('Cookie') ?? ''
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/)
  if (!match) return null

  const token = match[1]
  const value = await kv.get(`session:${token}`)
  if (!value) return null

  try {
    return JSON.parse(value) as SessionUser
  } catch {
    return null
  }
}

export function setSessionCookie(token: string, maxAge = 30 * 24 * 60 * 60): string {
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
}

export function clearSessionCookie(): string {
  return 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
}
