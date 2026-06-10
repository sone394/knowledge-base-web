import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import NoteEditor from '../components/NoteEditor'
import EditorTabBar from '../components/EditorTabBar'
import MobileShareButton from '../components/MobileShareButton'
import { EditorSessionProvider, useEditorSession } from '../context/EditorSessionContext'
import { useNotes } from '../hooks/useNotes'
import { useNoteContent } from '../hooks/useNoteContent'
import { useIsMobile } from '../hooks/useMediaQuery'

function NoteEditorPageContent() {
  const { id: routeNoteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { notes, createNote } = useNotes()
  const { openNote } = useEditorSession()
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    routeNoteId ?? null,
  )

  useEffect(() => {
    if (routeNoteId === 'index.html') {
      navigate('/notes/edit', { replace: true })
      return
    }
    if (routeNoteId) {
      setSelectedNoteId(routeNoteId)
      const note = notes.find((item) => item.id === routeNoteId)
      openNote(routeNoteId, note?.title ?? '未命名')
    }
    // 仅在路由变化时打开标签，避免 notes 刷新重复入栈
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeNoteId, navigate])

  const handleSelectNote = useCallback(
    (noteId: string | null) => {
      setSelectedNoteId(noteId)
      if (noteId) {
        const note = notes.find((item) => item.id === noteId)
        openNote(noteId, note?.title ?? '未命名')
        navigate(`/note/${noteId}`, { replace: true })
      } else {
        navigate('/notes/edit', { replace: true })
      }
    },
    [navigate, notes, openNote],
  )

  const handleNewTab = useCallback(async () => {
    try {
      const { data: note } = await createNote.mutateAsync({
        title: '',
        content: '',
        parent_id: null,
      })
      handleSelectNote(note.id)
    } catch {
      // createNote hook surfaces errors
    }
  }, [createNote, handleSelectNote])

  const mobileTitle = useMemo(() => {
    if (!selectedNoteId) return '笔记'
    const note = notes.find((item) => item.id === selectedNoteId)
    return note?.title.trim() || '无标题'
  }, [selectedNoteId, notes])

  const { title: noteTitle, content: noteContent } = useNoteContent(
    selectedNoteId ?? undefined,
  )

  const mobileHeaderExtra = useMemo(() => {
    if (!isMobile || !selectedNoteId) return null
    return <MobileShareButton title={noteTitle} content={noteContent} />
  }, [isMobile, selectedNoteId, noteTitle, noteContent])

  return (
    <AppLayout
      selectedNoteId={selectedNoteId}
      onSelectNote={handleSelectNote}
      mobileTitle={mobileTitle}
      headerExtra={mobileHeaderExtra}
    >
      <main className="flex min-h-0 flex-1 flex-col">
        {!isMobile && (
          <header className="hidden shrink-0 items-center border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900 md:flex">
            <Link
              to="/"
              className="touch-target mr-4 text-sm text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← 返回主页
            </Link>
            <EditorTabBar
              onSelectNote={handleSelectNote}
              onNewTab={() => void handleNewTab()}
            />
          </header>
        )}

        {!selectedNoteId ? (
          <div className="flex flex-1 items-center justify-center px-4 text-gray-400 dark:text-gray-500">
            <p className="text-center text-sm">
              {isMobile
                ? '点击左上角打开目录，选择或创建笔记'
                : '从左侧选择一篇笔记，或点击 + 创建新笔记'}
            </p>
          </div>
        ) : (
          <NoteEditor
            noteId={selectedNoteId}
            onSelectNote={handleSelectNote}
          />
        )}
      </main>
    </AppLayout>
  )
}

export default function NoteEditorPage() {
  return (
    <EditorSessionProvider>
      <NoteEditorPageContent />
    </EditorSessionProvider>
  )
}
