import { isSupabaseConfigured } from '../lib/supabaseConfig'

export default function SupabaseConfigBanner() {
  if (isSupabaseConfigured()) return null

  return (
    <div
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      role="alert"
    >
      Supabase 未正确配置：请在项目根目录创建 <code className="font-mono">.env</code>{' '}
      并设置 <code className="font-mono">VITE_SUPABASE_URL</code> 与{' '}
      <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>（可参考{' '}
      <code className="font-mono">.env.example</code>）。
    </div>
  )
}
