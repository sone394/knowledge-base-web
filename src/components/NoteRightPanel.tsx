import { useEffect, useMemo, useState } from 'react'
import { useBacklinks } from '../hooks/useBacklinks'
import { useNotes } from '../hooks/useNotes'
import type { Note } from '../../types/database'

type TabId = 'backlinks' | 'search'

type NoteRightPanelProps = {
  noteId: string
  onSelectNote: (noteId: string) => void
}

function getSearchSnippet(note: Note, query: string): string {
  const q = query.toLowerCase()
  const title = note.title.trim() || '未命名笔记'

  if (title.toLowerCase().includes(q)) {
    return title
  }

  const content = note.content
  const index = content.toLowerCase().indexOf(q)
  if (index === -1) return title

  const start = Math.max(0, index - 30)
  const end = Math.min(content.length, index + query.length + 50)
  const excerpt = content.slice(start, end).replace(/\n/g, ' ')
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${excerpt}${suffix}`
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
    <ul className="divide-y divide-gray-100">
      {backlinks.map((link) => (
        <li key={link.link_id}>
          <button
            type="button"
            onClick={() => onSelectNote(link.linked_from_note_id)}
            className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <span className="text-sm font-medium text-gray-800">
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
  const { notes, isLoading } = useNotes()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return []

    return notes
      .filter(
        (note) =>
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q),
      )
      .slice(0, 30)
      .map((note) => ({
        note,
        snippet: getSearchSnippet(note, q),
      }))
  }, [notes, debouncedQuery])

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-100 p-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题与内容…"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && debouncedQuery && (
          <p className="p-4 text-sm text-gray-400">加载中…</p>
        )}

        {!debouncedQuery.trim() && (
          <p className="p-4 text-sm text-gray-400">输入关键词搜索所有笔记</p>
        )}

        {debouncedQuery.trim() && !isLoading && results.length === 0 && (
          <p className="p-4 text-sm text-gray-400">未找到匹配的笔记</p>
        )}

        {results.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {results.map(({ note, snippet }) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onSelectNote(note.id)}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                    note.id === currentNoteId ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      note.id === currentNoteId ? 'text-blue-700' : 'text-gray-800'
                    }`}
                  >
                    {note.title.trim() || '未命名笔记'}
                  </span>
                  <span className="line-clamp-2 text-xs text-gray-500">{snippet}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'backlinks', label: '引用' },
  { id: 'search', label: '搜索' },
]

export default function NoteRightPanel({
  noteId,
  onSelectNote,
}: NoteRightPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('backlinks')

  if (collapsed) {
    return (
      <aside className="flex w-10 shrink-0 flex-col border-l border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-4 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
    <aside className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-gray-50">
      <div className="flex items-center border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 px-2 py-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
        {activeTab === 'search' && (
          <SearchTab currentNoteId={noteId} onSelectNote={onSelectNote} />
        )}
      </div>
    </aside>
  )
}
