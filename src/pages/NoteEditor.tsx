import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import NoteEditor from '../components/NoteEditor'
import { useNotes } from '../hooks/useNotes'
import { useIsMobile } from '../hooks/useMediaQuery'

export default function NoteEditorPage() {
  const { id: routeNoteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { notes } = useNotes()
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
    }
  }, [routeNoteId, navigate])

  const handleSelectNote = useCallback(
    (noteId: string | null) => {
      setSelectedNoteId(noteId)
      if (noteId) {
        navigate(`/note/${noteId}`, { replace: true })
      } else {
        navigate('/notes/edit', { replace: true })
      }
    },
    [navigate],
  )

  const mobileTitle = useMemo(() => {
    if (!selectedNoteId) return '笔记'
    const note = notes.find((item) => item.id === selectedNoteId)
    return note?.title.trim() || '无标题'
  }, [selectedNoteId, notes])

  return (
    <AppLayout
      selectedNoteId={selectedNoteId}
      onSelectNote={handleSelectNote}
      mobileTitle={mobileTitle}
    >
      <main className="flex min-h-0 flex-1 flex-col">
        {!isMobile && (
          <header className="hidden shrink-0 items-center border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900 md:flex">
            <Link
              to="/"
              className="touch-target text-sm text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← 返回主页
            </Link>
          </header>
        )}

        {!selectedNoteId ? (
          <div className="flex flex-1 items-center justify-center px-4 text-gray-400 dark:text-gray-500">
            <p className="text-center text-sm">
              {isMobile ? '点击左上角打开目录，选择或创建笔记' : '从左侧选择一篇笔记，或创建新笔记'}
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
