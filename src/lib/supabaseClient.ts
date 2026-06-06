import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { getSupabaseAnonKey, getSupabaseUrl } from './supabaseConfig'

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = getSupabaseAnonKey()

/** 与小程序共用同一 Supabase 项目；会话持久化到 localStorage 并自动刷新 */
const AUTH_STORAGE_KEY = 'knowledge-base-auth'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: AUTH_STORAGE_KEY,
  },
})
