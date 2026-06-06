import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <main className="min-h-screen bg-gray-50 p-8 dark:bg-gray-950">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</span>
        <div className="flex items-center gap-3">
          <div className="w-36">
            <ThemeToggle showLabel={false} className="w-auto justify-center px-3" />
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            退出登录
          </button>
        </div>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">主页 / Home</h1>
      <p className="mt-4 text-gray-600 dark:text-gray-400">知识库占位首页</p>
      <Link
        to="/notes/edit"
        className="mt-6 inline-block text-blue-600 hover:underline dark:text-blue-400"
      >
        前往笔记编辑 →
      </Link>
    </main>
  )
}
