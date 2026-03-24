import type { Env } from '../_env'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const state = crypto.randomUUID()

  await context.env.RESULTS_KV.put(
    `oauth_state:${state}`,
    JSON.stringify({ provider: 'github' }),
    { expirationTtl: 600 },
  )

  const params = new URLSearchParams({
    client_id: context.env.GITHUB_CLIENT_ID,
    redirect_uri: new URL('/api/auth/callback', context.request.url).toString(),
    scope: 'read:user user:email',
    state,
  })

  return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302)
}
