import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import NoteEditor from '../components/NoteEditor'

export default function NoteEditorPage() {
  const { id: routeNoteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    routeNoteId ?? null,
  )

  useEffect(() => {
    if (routeNoteId) {
      setSelectedNoteId(routeNoteId)
    }
  }, [routeNoteId])

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

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        selectedNoteId={selectedNoteId}
        onSelectNote={handleSelectNote}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center border-b border-gray-200 bg-white px-6 py-3">
          <Link
            to="/"
            className="text-sm text-gray-500 transition-colors hover:text-gray-800"
          >
            ← 返回主页
          </Link>
        </header>

        {!selectedNoteId ? (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            <p className="text-sm">从左侧选择一篇笔记，或创建新笔记</p>
          </div>
        ) : (
          <NoteEditor
            noteId={selectedNoteId}
            onSelectNote={handleSelectNote}
          />
        )}
      </main>
    </div>
  )
}
