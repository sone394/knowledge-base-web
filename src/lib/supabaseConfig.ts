const PLACEHOLDER_URL = 'your-project-id.supabase.co'
const PLACEHOLDER_KEY = 'your-anon-key-here'

export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL ?? `https://${PLACEHOLDER_URL}`
}

export function getSupabaseAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? PLACEHOLDER_KEY
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()

  return (
    url.length > 0 &&
    key.length > 0 &&
    !url.includes(PLACEHOLDER_URL) &&
    !key.includes(PLACEHOLDER_KEY)
  )
}
