import type { Env } from '../_env'
import { getSessionUser } from '../_auth'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = await getSessionUser(context.request, context.env.RESULTS_KV)

  return new Response(JSON.stringify({ user }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
