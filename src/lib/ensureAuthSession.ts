import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

/** 写操作前校验并刷新 Supabase 登录态（getSession 可能返回已过期 token） */
export async function ensureAuthSession(): Promise<Session> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('登录已过期，请刷新页面或重新登录后再试')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    throw new Error('登录已过期，请刷新页面或重新登录后再试')
  }

  const expiresAtMs = (session.expires_at ?? 0) * 1000
  if (expiresAtMs < Date.now() + 120_000) {
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession()

    if (refreshError || !refreshed.session) {
      throw new Error('登录已过期，请刷新页面或重新登录后再试')
    }

    return refreshed.session
  }

  return session
}
