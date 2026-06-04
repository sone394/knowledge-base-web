import { useCallback, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNoteTags } from '../hooks/useNoteTags'
import { useTags } from '../hooks/useTags'
import type { Tag } from '../../types/database'

type NoteTagPanelProps = {
  noteId: string
}

function NoteTagPanel({ noteId }: NoteTagPanelProps) {
  const { tags: noteTags, addTag, removeTag, isLoading } = useNoteTags(noteId)
  const { tags: allTags, createTag } = useTags()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const availableTags = allTags.filter(
    (tag) => !noteTags.some((nt) => nt.id === tag.id),
  )

  const handleAddTag = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return

      setError(null)
      const existing = allTags.find(
        (tag) => tag.name.toLowerCase() === trimmed.toLowerCase(),
      )

      try {
        let tagId = existing?.id
        if (!tagId) {
          const created = await createTag.mutateAsync(trimmed)
          tagId = created.id
        }
        await addTag.mutateAsync({ noteId, tagId })
        setInput('')
      } catch (err) {
        setError(err instanceof Error ? err.message : '添加标签失败')
      }
    },
    [allTags, addTag, createTag, noteId],
  )

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    handleAddTag(input)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddTag(input)
    }
  }

  const handleRemove = (tag: Tag) => {
    removeTag.mutate({ noteId, tagId: tag.id })
  }

  const isBusy = addTag.isPending || createTag.isPending || removeTag.isPending

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-gray-200 bg-gray-50 lg:w-56 lg:border-l lg:border-t-0">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          标签
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
          </div>
        ) : noteTags.length === 0 ? (
          <p className="text-sm text-gray-400">暂无标签</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {noteTags.map((tag) => (
              <li key={tag.id}>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemove(tag)}
                    disabled={isBusy}
                    className="rounded-full p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-50"
                    aria-label={`移除标签 ${tag.name}`}
                  >
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden>
                      <path d="M3.5 3.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <input
            type="text"
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入标签名，回车添加"
            disabled={isBusy}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          />
        </form>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        {availableTags.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-gray-400">快速添加</p>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.slice(0, 8).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag.mutate({ noteId, tagId: tag.id })}
                  disabled={isBusy}
                  className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
                >
                  + {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default NoteTagPanel
