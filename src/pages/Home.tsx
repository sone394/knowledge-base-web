import { useCallback, useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import { useNotes } from '../hooks/useNotes'
import { useTags } from '../hooks/useTags'
import { useReviewCount } from '../hooks/useReview'
import {
  findJournalFolder,
  findTodayJournalId,
  JOURNAL_FOLDER_TITLE,
} from '../lib/journal'
import { buildNoteFromTemplate } from '../lib/noteTemplates'
import type { Note } from '../../types/database'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(iso).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

function isFolderNote(note: Note, parentIds: Set<string>): boolean {
  return parentIds.has(note.id) && !note.content.trim()
}

function countLeafNotes(notes: Note[]): number {
  const parentIds = new Set(
    notes.map((note) => note.parent_id).filter((id): id is string => !!id),
  )
  return notes.filter((note) => !isFolderNote(note, parentIds)).length
}

function countNotesThisWeek(notes: Note[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return notes.filter((note) => new Date(note.created_at).getTime() >= weekAgo)
    .length
}

type StatCardProps = {
  label: string
  value: number | string
  hint?: string
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  )
}

type QuickActionProps = {
  title: string
  description: string
  onClick?: () => void
  to?: string
  badge?: number
  icon: ReactNode
  accent?: 'blue' | 'amber' | 'violet' | 'emerald'
}

const accentStyles = {
  blue: 'border-blue-100 bg-blue-50/80 text-blue-700 hover:border-blue-200 hover:bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:border-blue-800',
  amber:
    'border-amber-100 bg-amber-50/80 text-amber-800 hover:border-amber-200 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:border-amber-800',
  violet:
    'border-violet-100 bg-violet-50/80 text-violet-700 hover:border-violet-200 hover:bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:border-violet-800',
  emerald:
    'border-emerald-100 bg-emerald-50/80 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:border-emerald-800',
}

function QuickAction({
  title,
  description,
  onClick,
  to,
  badge,
  icon,
  accent = 'blue',
}: QuickActionProps) {
  const className = `group relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors ${accentStyles[accent]}`

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-lg bg-white/70 p-2 dark:bg-black/20">{icon}</span>
        {badge !== undefined && badge > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm opacity-80">{description}</p>
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

type FeatureLinkProps = {
  to: string
  title: string
  description: string
}

function FeatureLink({ to, title, description }: FeatureLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
    >
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      <span className="text-gray-400 transition-transform group-hover:translate-x-0.5 dark:text-gray-500">
        →
      </span>
    </Link>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notes, isLoading, createNote } = useNotes()
  const { tags } = useTags()
  const { count: dueReviewCount } = useReviewCount()

  const handleSelectNote = useCallback(
    (noteId: string | null) => {
      if (noteId) navigate(`/note/${noteId}`)
      else navigate('/notes/edit')
    },
    [navigate],
  )

  const parentIds = useMemo(
    () =>
      new Set(
        notes.map((note) => note.parent_id).filter((id): id is string => !!id),
      ),
    [notes],
  )

  const stats = useMemo(
    () => ({
      totalNotes: countLeafNotes(notes),
      notesThisWeek: countNotesThisWeek(notes),
      totalTags: tags.length,
      dueReview: dueReviewCount,
    }),
    [notes, tags.length, dueReviewCount],
  )

  const recentNotes = useMemo(
    () =>
      notes
        .filter((note) => !isFolderNote(note, parentIds))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 8),
    [notes, parentIds],
  )

  const handleWriteJournal = useCallback(async () => {
    if (createNote.isPending) return

    const folder = findJournalFolder(notes)

    if (folder) {
      const existingId = findTodayJournalId(notes, folder.id)
      if (existingId) {
        navigate(`/note/${existingId}`)
        return
      }

      const { title, content } = buildNoteFromTemplate('daily')
      createNote.mutate(
        { parent_id: folder.id, title, content },
        {
          onSuccess: ({ data: note }) => navigate(`/note/${note.id}`),
        },
      )
      return
    }

    const rootNotes = notes.filter((note) => note.parent_id === null)
    const minSort =
      rootNotes.length > 0
        ? Math.min(...rootNotes.map((note) => note.sort_order))
        : 0

    try {
      const { data: newFolder } = await createNote.mutateAsync({
        parent_id: null,
        title: JOURNAL_FOLDER_TITLE,
        content: '',
        sort_order: minSort - 1,
      })

      const { title, content } = buildNoteFromTemplate('daily')
      createNote.mutate(
        { parent_id: newFolder.id, title, content },
        {
          onSuccess: ({ data: note }) => navigate(`/note/${note.id}`),
        },
      )
    } catch {
      // createNote mutation 会通过 isError 反馈
    }
  }, [createNote, navigate, notes])

  const displayName = user?.email?.split('@')[0] ?? '用户'

  return (
    <AppLayout mobileTitle="首页" onSelectNote={handleSelectNote}>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-6 shadow-sm dark:border-gray-700 dark:from-blue-950/30 dark:via-gray-900 dark:to-violet-950/20">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getGreeting()}，{displayName}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
              个人知识库
            </h1>
            <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-400">
              记录想法、串联知识、定期复习。从这里快速开始今天的学习与整理。
            </p>
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <p className="text-sm text-gray-500">加载中…</p>
              </div>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="笔记总数" value={stats.totalNotes} />
                <StatCard
                  label="本周新建"
                  value={stats.notesThisWeek}
                  hint="近 7 天"
                />
                <StatCard label="标签数量" value={stats.totalTags} />
                <StatCard
                  label="待复习"
                  value={stats.dueReview}
                  hint={stats.dueReview > 0 ? '今日到期' : '暂无到期'}
                />
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  快捷操作
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <QuickAction
                    title="新建笔记"
                    description="从空白页开始记录"
                    onClick={() => navigate('/notes/edit')}
                    accent="blue"
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    }
                  />
                  <QuickAction
                    title="写日记"
                    description="打开或创建今日日记"
                    onClick={() => void handleWriteJournal()}
                    accent="amber"
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    }
                  />
                  <QuickAction
                    title="搜索笔记"
                    description="全文检索标题与内容"
                    to="/search"
                    accent="violet"
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                        <circle cx="11" cy="11" r="7" />
                        <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                      </svg>
                    }
                  />
                  <QuickAction
                    title="今日复习"
                    description="巩固间隔重复中的笔记"
                    to="/review"
                    badge={stats.dueReview}
                    accent="emerald"
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-3">
                <section className="lg:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      最近更新
                    </h2>
                    {recentNotes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => navigate('/notes/edit')}
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        查看全部笔记
                      </button>
                    )}
                  </div>

                  {recentNotes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-900">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        还没有笔记，从第一条记录开始吧
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/notes/edit')}
                        className="touch-target mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        创建第一篇笔记
                      </button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
                      {recentNotes.map((note) => (
                        <li key={note.id}>
                          <button
                            type="button"
                            onClick={() => navigate(`/note/${note.id}`)}
                            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                          >
                            <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                              {note.title.trim() || '未命名笔记'}
                            </span>
                            <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                              {formatRelativeTime(note.updated_at)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    更多功能
                  </h2>
                  <div className="space-y-2">
                    <FeatureLink
                      to="/dashboard"
                      title="数据仪表盘"
                      description="查看笔记趋势与标签统计"
                    />
                    <FeatureLink
                      to="/graph"
                      title="知识图谱"
                      description="可视化笔记之间的链接"
                    />
                    <FeatureLink
                      to="/trash"
                      title="回收站"
                      description="恢复或永久删除笔记"
                    />
                    <FeatureLink
                      to="/settings"
                      title="设置"
                      description="导出、加密与偏好配置"
                    />
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </AppLayout>
  )
}
