import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import {
  useDueReviewNotes,
  useSubmitReview,
} from '../hooks/useReview'
import { markdownToHtml } from '../lib/markdown'
import {
  formatReviewDueDate,
  isReviewOverdue,
  REVIEW_RATING_OPTIONS,
  type ReviewRating,
} from '../lib/spacedRepetition'
import type { Note } from '../../types/database'

const ratingButtonClass: Record<string, string> = {
  red: 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 dark:hover:border-red-700',
  amber:
    'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:border-amber-700',
  green:
    'border-green-200 bg-green-50 text-green-800 hover:border-green-300 hover:bg-green-100 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300 dark:hover:border-green-700',
}

function ReviewContent({ note }: { note: Note }) {
  const html = useMemo(() => markdownToHtml(note.content), [note.content])

  return (
    <article
      className="note-editor-content max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default function ReviewPage() {
  const navigate = useNavigate()
  const { data: dueNotes = [], isLoading, isError, refetch } = useDueReviewNotes()
  const submitReview = useSubmitReview()
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  const activeNote = useMemo(
    () => dueNotes.find((note) => note.id === activeNoteId) ?? null,
    [dueNotes, activeNoteId],
  )

  const handleSelectNote = useCallback(
    (noteId: string | null) => {
      if (noteId) navigate(`/note/${noteId}`)
      else navigate('/notes/edit')
    },
    [navigate],
  )

  const handleRating = useCallback(
    async (note: Note, rating: ReviewRating) => {
      await submitReview.mutateAsync({ note, rating })
      setActiveNoteId(null)
    },
    [submitReview],
  )

  return (
    <AppLayout mobileTitle="今日复习" onSelectNote={handleSelectNote}>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                今日复习
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                根据间隔重复算法，复习到期笔记以巩固记忆
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="touch-target self-start rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              刷新
            </button>
          </header>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          )}

          {isError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
              加载复习列表失败，请稍后重试
            </p>
          )}

          {!isLoading && !isError && !activeNote && dueNotes.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900">
              <svg
                viewBox="0 0 24 24"
                className="mx-auto h-12 w-12 text-green-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-4 text-base font-medium text-gray-900 dark:text-gray-100">
                今天没有待复习的笔记
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                在笔记编辑器中开启「需要复习」即可纳入复习计划
              </p>
            </div>
          )}

          {!activeNote && dueNotes.length > 0 && (
            <section>
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                共 {dueNotes.length} 篇待复习 · 按到期日排序（逾期优先）
              </p>
              <ul className="space-y-2">
                {dueNotes.map((note) => {
                  const overdue = isReviewOverdue(note.next_review_date)
                  return (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => setActiveNoteId(note.id)}
                      className="touch-target flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                    >
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {note.title.trim() || '未命名笔记'}
                      </span>
                      <span
                        className={`shrink-0 text-xs ${
                          overdue
                            ? 'font-medium text-red-500 dark:text-red-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {formatReviewDueDate(note.next_review_date)}
                        {note.review_count > 0 && ` · 第 ${note.review_count + 1} 次`}
                      </span>
                    </button>
                  </li>
                  )
                })}
              </ul>
            </section>
          )}

          {activeNote && (
            <section className="space-y-6">
              <button
                type="button"
                onClick={() => setActiveNoteId(null)}
                className="touch-target flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                返回列表
              </button>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 md:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {activeNote.title.trim() || '未命名笔记'}
                  </h2>
                  <Link
                    to={`/note/${activeNote.id}`}
                    className="shrink-0 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    打开编辑器
                  </Link>
                </div>

                <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <ReviewContent note={activeNote} />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="mb-4 text-center text-base font-medium text-gray-900 dark:text-gray-100">
                  记得如何？
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {REVIEW_RATING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={submitReview.isPending}
                      onClick={() => void handleRating(activeNote, option.value)}
                      className={`touch-target flex flex-col items-center rounded-xl border px-4 py-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ratingButtonClass[option.color]}`}
                    >
                      <span className="text-base font-semibold">{option.label}</span>
                      <span className="mt-1 text-xs opacity-80">{option.description}</span>
                    </button>
                  ))}
                </div>
                {submitReview.isError && (
                  <p className="mt-3 text-center text-xs text-red-500">
                    保存复习结果失败，请重试
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </AppLayout>
  )
}
