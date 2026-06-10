import { useEditorSession } from '../context/EditorSessionContext'

type EditorTabBarProps = {
  onSelectNote: (noteId: string | null) => void
  onNewTab?: () => void
}

export default function EditorTabBar({
  onSelectNote,
  onNewTab,
}: EditorTabBarProps) {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    closeTab,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
  } = useEditorSession()

  if (tabs.length === 0) return null

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-800 dark:bg-gray-900/80">
      <div className="flex items-center gap-0.5 pr-1">
        <button
          type="button"
          disabled={!canGoBack}
          onClick={() => {
            const noteId = goBack()
            if (noteId) onSelectNote(noteId)
          }}
          title="后退"
          className="touch-target rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          disabled={!canGoForward}
          onClick={() => {
            const noteId = goForward()
            if (noteId) onSelectNote(noteId)
          }}
          title="前进"
          className="touch-target rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 4l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              className={`group flex max-w-[12rem] shrink-0 items-center rounded-t-md border border-b-0 text-sm transition-colors ${
                isActive
                  ? 'border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
                  : 'border-transparent bg-transparent text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  const noteId = setActiveTab(tab.id)
                  if (noteId) onSelectNote(noteId)
                }}
                className="truncate px-3 py-1.5"
                title={tab.title}
              >
                {tab.title}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  const nextNoteId = closeTab(tab.id)
                  onSelectNote(nextNoteId)
                }}
                className="rounded p-1 pr-2 text-gray-400 opacity-0 transition-opacity hover:text-gray-700 group-hover:opacity-100 dark:hover:text-gray-200"
                aria-label={`关闭 ${tab.title}`}
              >
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path strokeLinecap="round" d="M2 2l8 8M10 2L2 10" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {onNewTab && (
        <button
          type="button"
          onClick={onNewTab}
          title="新建笔记"
          className="touch-target shrink-0 rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" d="M10 4v12M4 10h12" />
          </svg>
        </button>
      )}
    </div>
  )
}
