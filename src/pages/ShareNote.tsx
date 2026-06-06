import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { isEncrypted } from '../lib/encryption'
import { formatSavedTime, markdownToHtml } from '../lib/markdown'
import type { SharedNote } from '../../types/database'

async function fetchSharedNote(noteId: string): Promise<SharedNote> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, updated_at, is_shared')
    .eq('id', noteId)
    .eq('is_shared', true)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return data
}

function SharedNoteContent({ content }: { content: string }) {
  const html = useMemo(() => markdownToHtml(content), [content])

  return (
    <article
      className="note-editor-content max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default function ShareNotePage() {
  const { noteId } = useParams<{ noteId: string }>()

  const { data: note, isLoading, isError, error } = useQuery({
    queryKey: ['sharedNote', noteId],
    queryFn: () => fetchSharedNote(noteId!),
    enabled: !!noteId,
    retry: false,
  })

  const contentEncrypted = note?.content ? isEncrypted(note.content) : false

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">知识库 · 公开分享</p>
          <Link
            to="/"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            打开知识库
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
        {isLoading && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">加载中…</p>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-900 dark:bg-red-950/40">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              无法访问此分享
            </p>
            <p className="mt-2 text-sm text-red-600/80 dark:text-red-400/80">
              {error instanceof Error
                ? error.message.includes('0 rows')
                  ? '链接无效或分享已关闭'
                  : error.message
                : '请稍后重试'}
            </p>
          </div>
        )}

        {note && (
          <article className="space-y-6">
            <header className="space-y-2 border-b border-gray-200 pb-6 dark:border-gray-800">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {note.title.trim() || '无标题'}
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                更新于 {formatSavedTime(note.updated_at)}
              </p>
            </header>

            {contentEncrypted ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                此笔记内容已加密，无法公开阅读。请让分享者在编辑器中重新创建分享链接。
              </p>
            ) : note.content.trim() ? (
              <SharedNoteContent content={note.content} />
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">（空笔记）</p>
            )}
          </article>
        )}
      </main>
    </div>
  )
}
