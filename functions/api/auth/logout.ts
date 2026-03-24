import type { Env } from '../_env'
import { clearSessionCookie } from '../_auth'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const cookie = context.request.headers.get('Cookie') ?? ''
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/)
  if (match) {
    await context.env.RESULTS_KV.delete(`session:${match[1]}`)
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
  })
}
