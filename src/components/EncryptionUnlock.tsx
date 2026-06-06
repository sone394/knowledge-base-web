import { useState, type FormEvent } from 'react'
import ThemeToggle from './ThemeToggle'

type EncryptionUnlockProps = {
  onSubmit: (password: string, rememberSession: boolean) => void
  error: string | null
}

export default function EncryptionUnlock({
  onSubmit,
  error,
}: EncryptionUnlockProps) {
  const [password, setPassword] = useState('')
  const [rememberSession, setRememberSession] = useState(true)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(password, rememberSession)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-950">
      <div className="absolute right-4 top-4 w-40">
        <ThemeToggle showLabel={false} className="w-auto justify-center px-3" />
      </div>

      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">解锁知识库</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          请输入知识库密码以解密并编辑笔记。密码仅保存在内存或当前标签页的 sessionStorage 中。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="vault-unlock-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              知识库密码
            </label>
            <input
              id="vault-unlock-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            在本标签页会话中记住密码
          </label>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            解锁
          </button>
        </form>
      </div>
    </div>
  )
}
