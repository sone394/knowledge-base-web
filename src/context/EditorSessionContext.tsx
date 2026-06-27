import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type EditorTab = {
  id: string
  noteId: string
  title: string
}

type NavState = {
  history: string[]
  index: number
}

type EditorSessionContextValue = {
  tabs: EditorTab[]
  activeTabId: string | null
  canGoBack: boolean
  canGoForward: boolean
  openNote: (noteId: string, title?: string) => void
  closeTab: (tabId: string) => string | null
  setActiveTab: (tabId: string) => string | null
  updateTabTitle: (noteId: string, title: string) => void
  closeTabsForNote: (noteId: string) => string | null
  goBack: () => string | null
  goForward: () => string | null
}

const EditorSessionContext = createContext<EditorSessionContextValue | null>(
  null,
)

function createTabId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function EditorSessionProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<EditorTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [nav, setNav] = useState<NavState>({ history: [], index: -1 })

  const pushHistory = useCallback((noteId: string) => {
    setNav((prev) => {
      const trimmed = prev.history.slice(0, prev.index + 1)
      if (trimmed[trimmed.length - 1] === noteId) return prev
      const history = [...trimmed, noteId]
      return { history, index: history.length - 1 }
    })
  }, [])

  const openNote = useCallback(
    (noteId: string, title = '未命名') => {
      setTabs((prev) => {
        const existing = prev.find((tab) => tab.noteId === noteId)
        if (existing) {
          setActiveTabId(existing.id)
          return prev
        }
        const tab: EditorTab = {
          id: createTabId(),
          noteId,
          title: title.trim() || '未命名',
        }
        setActiveTabId(tab.id)
        return [...prev, tab]
      })
      pushHistory(noteId)
    },
    [pushHistory],
  )

  const closeTab = useCallback(
    (tabId: string): string | null => {
      let nextNoteId: string | null = null
      setTabs((prev) => {
        const index = prev.findIndex((tab) => tab.id === tabId)
        if (index < 0) return prev
        const next = prev.filter((tab) => tab.id !== tabId)
        if (activeTabId === tabId) {
          const fallback = next[index] ?? next[index - 1] ?? null
          setActiveTabId(fallback?.id ?? null)
          nextNoteId = fallback?.noteId ?? null
        }
        return next
      })
      return nextNoteId
    },
    [activeTabId],
  )

  const setActiveTab = useCallback(
    (tabId: string): string | null => {
      let noteId: string | null = null
      setTabs((prev) => {
        const tab = prev.find((item) => item.id === tabId)
        if (tab) {
          noteId = tab.noteId
          setActiveTabId(tabId)
        }
        return prev
      })
      if (noteId) pushHistory(noteId)
      return noteId
    },
    [pushHistory],
  )

  const updateTabTitle = useCallback((noteId: string, title: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.noteId === noteId
          ? { ...tab, title: title.trim() || '未命名' }
          : tab,
      ),
    )
  }, [])

  const closeTabsForNote = useCallback(
    (noteId: string): string | null => {
      let nextNoteId: string | null = null
      setTabs((prev) => {
        const closingActive = prev.some(
          (tab) => tab.noteId === noteId && tab.id === activeTabId,
        )
        const next = prev.filter((tab) => tab.noteId !== noteId)
        if (closingActive) {
          const fallback = next[next.length - 1] ?? null
          setActiveTabId(fallback?.id ?? null)
          nextNoteId = fallback?.noteId ?? null
        }
        return next
      })
      return nextNoteId
    },
    [activeTabId],
  )

  const goBack = useCallback((): string | null => {
    let noteId: string | null = null
    setNav((prev) => {
      if (prev.index <= 0) return prev
      const nextIndex = prev.index - 1
      noteId = prev.history[nextIndex] ?? null
      return { ...prev, index: nextIndex }
    })
    if (noteId) {
      const tab = tabs.find((item) => item.noteId === noteId)
      if (tab) setActiveTabId(tab.id)
    }
    return noteId
  }, [tabs])

  const goForward = useCallback((): string | null => {
    let noteId: string | null = null
    setNav((prev) => {
      if (prev.index >= prev.history.length - 1) return prev
      const nextIndex = prev.index + 1
      noteId = prev.history[nextIndex] ?? null
      return { ...prev, index: nextIndex }
    })
    if (noteId) {
      const tab = tabs.find((item) => item.noteId === noteId)
      if (tab) setActiveTabId(tab.id)
    }
    return noteId
  }, [tabs])

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      canGoBack: nav.index > 0,
      canGoForward: nav.index < nav.history.length - 1,
      openNote,
      closeTab,
      setActiveTab,
      updateTabTitle,
      closeTabsForNote,
      goBack,
      goForward,
    }),
    [
      tabs,
      activeTabId,
      nav.index,
      nav.history.length,
      openNote,
      closeTab,
      setActiveTab,
      updateTabTitle,
      closeTabsForNote,
      goBack,
      goForward,
    ],
  )

  return (
    <EditorSessionContext.Provider value={value}>
      {children}
    </EditorSessionContext.Provider>
  )
}

export function useEditorSession() {
  const context = useContext(EditorSessionContext)
  if (!context) {
    throw new Error('useEditorSession must be used within EditorSessionProvider')
  }
  return context
}
