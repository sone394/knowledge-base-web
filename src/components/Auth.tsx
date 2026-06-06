import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import ThemeToggle from './ThemeToggle'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
    }
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-950">
      <div className="absolute right-4 top-4 w-40">
        <ThemeToggle showLabel={false} className="w-auto justify-center px-3" />
      </div>

      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          登录知识库
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          使用 Supabase 邮箱与密码登录
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              邮箱
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '登录中…' : '登录'}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          请先在 Supabase 控制台创建用户（Authentication → Users → Add user）。
        </p>
      </div>
    </div>
  )
}
