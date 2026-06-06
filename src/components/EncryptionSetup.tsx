import { useState, type FormEvent } from 'react'
import ThemeToggle from './ThemeToggle'

type EncryptionSetupProps = {
  onSubmit: (password: string, rememberSession: boolean) => void
  error: string | null
}

export default function EncryptionSetup({
  onSubmit,
  error,
}: EncryptionSetupProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [rememberSession, setRememberSession] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLocalError(null)

    if (password.length < 6) {
      setLocalError('知识库密码至少 6 个字符')
      return
    }
    if (password !== confirm) {
      setLocalError('两次输入的密码不一致')
      return
    }

    onSubmit(password, rememberSession)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-950">
      <div className="absolute right-4 top-4 w-40">
        <ThemeToggle showLabel={false} className="w-auto justify-center px-3" />
      </div>

      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md dark:border dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">设置知识库密码</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          笔记正文将在浏览器端加密后再存入 Supabase。请设置独立于登录密码的知识库密码，丢失后无法恢复笔记内容。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="vault-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              知识库密码
            </label>
            <input
              id="vault-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="至少 6 个字符"
            />
          </div>

          <div>
            <label
              htmlFor="vault-password-confirm"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              确认密码
            </label>
            <input
              id="vault-password-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder="再次输入密码"
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

          {(localError || error) && (
            <p className="text-sm text-red-600" role="alert">
              {localError ?? error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            启用加密
          </button>
        </form>
      </div>
    </div>
  )
}
