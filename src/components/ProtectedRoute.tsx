import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import Auth from './Auth'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">加载中…</p>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return <>{children}</>
}
