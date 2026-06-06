import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import HighlightedText from '../components/HighlightedText'
import { useNoteSearch } from '../hooks/useNotes'
import { getSearchSnippet } from '../lib/noteSearch'

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { results, isFetching, isError, error } = useNoteSearch(query)

  const handleSelectNote = useCallback(
    (noteId: string | null) => {
      if (noteId) navigate(`/note/${noteId}`)
      else navigate('/notes/edit')
    },
    [navigate],
  )

  const trimmedQuery = query.trim()

  const resultItems = useMemo(
    () =>
      results.map((note) => ({
        note,
        snippet: getSearchSnippet(note, trimmedQuery),
      })),
    [results, trimmedQuery],
  )

  return (
    <AppLayout mobileTitle="搜索" onSelectNote={handleSelectNote}>
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索笔记标题或内容…"
              aria-label="搜索笔记"
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-base text-gray-800 outline-none transition-colors focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!trimmedQuery && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
              输入关键词搜索笔记
            </p>
          )}

          {isError && (
            <p className="text-center text-sm text-red-600 dark:text-red-400" role="alert">
              搜索失败：{error instanceof Error ? error.message : '请稍后重试'}
            </p>
          )}

          {isFetching && trimmedQuery && (
            <p className="text-center text-sm text-gray-400">搜索中…</p>
          )}

          {!isFetching && !isError && trimmedQuery && results.length === 0 && (
            <p className="text-center text-sm text-gray-400">未找到匹配的笔记</p>
          )}

          <ul className="space-y-2">
            {resultItems.map(({ note, snippet }) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => handleSelectNote(note.id)}
                  className="touch-target flex w-full flex-col rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                >
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    <HighlightedText
                      text={note.title.trim() || '未命名笔记'}
                      query={trimmedQuery}
                    />
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    <HighlightedText text={snippet} query={trimmedQuery} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </AppLayout>
  )
}
