import type { Env } from '../_env'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const state = crypto.randomUUID()

  await context.env.RESULTS_KV.put(
    `oauth_state:${state}`,
    JSON.stringify({ provider: 'google' }),
    { expirationTtl: 600 },
  )

  const params = new URLSearchParams({
    client_id: context.env.GOOGLE_CLIENT_ID,
    redirect_uri: new URL('/api/auth/callback', context.request.url).toString(),
    response_type: 'code',
    scope: 'openid profile email',
    state,
  })

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302)
}
