import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, signOut } = useAuth()

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          退出登录
        </button>
      </div>
      <h1 className="text-3xl font-bold text-gray-900">主页 / Home</h1>
      <p className="mt-4 text-gray-600">知识库占位首页</p>
      <Link
        to="/notes/edit"
        className="mt-6 inline-block text-blue-600 hover:underline"
      >
        前往笔记编辑 →
      </Link>
    </main>
  )
}
