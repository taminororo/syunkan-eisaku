import type { Env } from '../_env'
import type { SessionUser } from '../_auth'
import { setSessionCookie } from '../_auth'

interface GoogleTokenResponse {
  access_token: string
}

interface GoogleUserInfo {
  sub: string
  name?: string
  picture?: string
}

interface GitHubTokenResponse {
  access_token: string
}

interface GitHubUser {
  id: number
  login: string
  avatar_url: string
}

const SESSION_TTL = 30 * 24 * 60 * 60

async function handleGoogle(code: string, redirectUri: string, env: Env): Promise<SessionUser> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) throw new Error('Google token exchange failed')
  const { access_token } = await tokenRes.json() as GoogleTokenResponse

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!userRes.ok) throw new Error('Google userinfo failed')
  const info = await userRes.json() as GoogleUserInfo

  return {
    id: `google:${info.sub}`,
    nickname: info.name ?? 'Google User',
    avatarUrl: info.picture ?? '',
    provider: 'google',
  }
}

async function handleGitHub(code: string, redirectUri: string, env: Env): Promise<SessionUser> {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  })
  if (!tokenRes.ok) throw new Error('GitHub token exchange failed')
  const { access_token } = await tokenRes.json() as GitHubTokenResponse

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${access_token}`,
      'User-Agent': 'syunkan-eisaku',
    },
  })
  if (!userRes.ok) throw new Error('GitHub user API failed')
  const user = await userRes.json() as GitHubUser

  return {
    id: `github:${user.id}`,
    nickname: user.login,
    avatarUrl: user.avatar_url,
    provider: 'github',
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return Response.redirect(new URL('/?auth_error=missing_params', url.origin).toString(), 302)
  }

  // Validate state
  const stateValue = await context.env.RESULTS_KV.get(`oauth_state:${state}`)
  if (!stateValue) {
    return Response.redirect(new URL('/?auth_error=invalid_state', url.origin).toString(), 302)
  }
  await context.env.RESULTS_KV.delete(`oauth_state:${state}`)

  const { provider } = JSON.parse(stateValue) as { provider: 'google' | 'github' }
  const redirectUri = new URL('/api/auth/callback', url.origin).toString()

  let sessionUser: SessionUser
  try {
    sessionUser = provider === 'google'
      ? await handleGoogle(code, redirectUri, context.env)
      : await handleGitHub(code, redirectUri, context.env)
  } catch (e) {
    console.error('OAuth error:', e instanceof Error ? e.message : e)
    return Response.redirect(new URL('/?auth_error=oauth_failed', url.origin).toString(), 302)
  }

  // Create session
  const token = crypto.randomUUID()
  await context.env.RESULTS_KV.put(
    `session:${token}`,
    JSON.stringify(sessionUser),
    { expirationTtl: SESSION_TTL },
  )

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': setSessionCookie(token, SESSION_TTL),
    },
  })
}
