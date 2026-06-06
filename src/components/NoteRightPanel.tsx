import { useEffect, useMemo, useState } from 'react'
import { useBacklinks } from '../hooks/useBacklinks'
import { useNoteSearch, useNotes } from '../hooks/useNotes'
import HighlightedText from './HighlightedText'
import { getSearchSnippet } from '../lib/noteSearch'
import { findRelatedNotes } from '../lib/textSimilarity'

type TabId = 'backlinks' | 'search' | 'related'

type NoteRightPanelProps = {
  noteId: string
  title: string
  content: string
  onSelectNote: (noteId: string) => void
}

function BacklinksTab({
  noteId,
  onSelectNote,
}: {
  noteId: string
  onSelectNote: (noteId: string) => void
}) {
  const { backlinks, isLoading, isError } = useBacklinks(noteId)

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="p-4 text-sm text-red-500">加载引用失败</p>
  }

  if (backlinks.length === 0) {
    return (
      <p className="p-4 text-sm text-gray-400">暂无其他笔记链接到本篇</p>
    )
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {backlinks.map((link) => (
        <li key={link.link_id}>
          <button
            type="button"
            onClick={() => onSelectNote(link.linked_from_note_id)}
            className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {link.linked_from_title.trim() || '未命名笔记'}
            </span>
            <span className="text-xs text-gray-400">
              {new Intl.DateTimeFormat('zh-CN', {
                month: 'short',
                day: 'numeric',
              }).format(new Date(link.link_created_at))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function SearchTab({
  currentNoteId,
  onSelectNote,
}: {
  currentNoteId: string
  onSelectNote: (noteId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const {
    results: searchResults,
    isLoading,
    isFetching,
    isError,
    error,
  } = useNoteSearch(debouncedQuery)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const results = useMemo(
    () =>
      searchResults.map((note) => ({
        note,
        snippet: getSearchSnippet(note, debouncedQuery),
      })),
    [searchResults, debouncedQuery],
  )

  const isSearching = (isLoading || isFetching) && !!debouncedQuery.trim()

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-100 p-3 dark:border-gray-800">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题与内容…"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <p className="p-4 text-sm text-gray-400">搜索中…</p>
        )}

        {!debouncedQuery.trim() && (
          <p className="p-4 text-sm text-gray-400">输入关键词搜索所有笔记</p>
        )}

        {isError && (
          <p className="p-4 text-sm text-red-500" role="alert">
            搜索失败：{error instanceof Error ? error.message : '请稍后重试'}
          </p>
        )}

        {debouncedQuery.trim() && !isSearching && !isError && results.length === 0 && (
          <p className="p-4 text-sm text-gray-400">未找到匹配的笔记</p>
        )}

        {results.length > 0 && (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {results.map(({ note, snippet }) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onSelectNote(note.id)}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                    note.id === currentNoteId ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      note.id === currentNoteId
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <HighlightedText
                      text={note.title.trim() || '未命名笔记'}
                      query={debouncedQuery}
                    />
                  </span>
                  <span className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    <HighlightedText text={snippet} query={debouncedQuery} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function RelatedNotesTab({
  noteId,
  title,
  content,
  onSelectNote,
}: {
  noteId: string
  title: string
  content: string
  onSelectNote: (noteId: string) => void
}) {
  const { notes, isLoading } = useNotes()
  const [debouncedText, setDebouncedText] = useState({ title, content })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText({ title, content }), 2000)
    return () => clearTimeout(timer)
  }, [title, content])

  const relatedNotes = useMemo(
    () =>
      findRelatedNotes(
        noteId,
        debouncedText.title,
        debouncedText.content,
        notes,
        5,
      ),
    [noteId, debouncedText.title, debouncedText.content, notes],
  )

  const isPending =
    title !== debouncedText.title || content !== debouncedText.content

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!title.trim() && !content.trim()) {
    return (
      <p className="p-4 text-sm text-gray-400">开始写作后，将自动推荐相关笔记</p>
    )
  }

  if (isPending) {
    return <p className="p-4 text-sm text-gray-400">正在分析内容…</p>
  }

  if (relatedNotes.length === 0) {
    return (
      <p className="p-4 text-sm text-gray-400">暂未找到内容相似的笔记</p>
    )
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
      {relatedNotes.map((item) => (
        <li key={item.noteId}>
          <button
            type="button"
            onClick={() => onSelectNote(item.noteId)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
              {item.title}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-gray-400">
              {item.similarity}%
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'backlinks', label: '引用' },
  { id: 'related', label: '相关' },
  { id: 'search', label: '搜索' },
]

export default function NoteRightPanel({
  noteId,
  title,
  content,
  onSelectNote,
}: NoteRightPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('backlinks')

  if (collapsed) {
    return (
      <aside className="flex w-10 shrink-0 flex-col border-l border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-4 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title="展开面板"
          aria-label="展开右侧面板"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M10 4l-4 4 4 4V4z" />
          </svg>
          <span
            className="text-[10px] font-medium"
            style={{ writingMode: 'vertical-rl' }}
          >
            面板
          </span>
        </button>
      </aside>
    )
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 px-2 py-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title="折叠面板"
          aria-label="折叠右侧面板"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M6 4l4 4-4 4V4z" />
          </svg>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'backlinks' && (
          <BacklinksTab noteId={noteId} onSelectNote={onSelectNote} />
        )}
        {activeTab === 'related' && (
          <RelatedNotesTab
            noteId={noteId}
            title={title}
            content={content}
            onSelectNote={onSelectNote}
          />
        )}
        {activeTab === 'search' && (
          <SearchTab currentNoteId={noteId} onSelectNote={onSelectNote} />
        )}
      </div>
    </aside>
  )
}
