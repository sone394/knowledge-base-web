import { useEffect, useMemo, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { useNoteContent } from '../hooks/useNoteContent'
import { useNotes } from '../hooks/useNotes'
import {
  formatSavedTime,
  htmlToMarkdown,
  markdownToHtml,
} from '../lib/markdown'
import { NoteLinkExtension } from '../lib/tiptap/noteLinkExtension'
import NoteTagPanel from './NoteTagPanel'
import NoteRightPanel from './NoteRightPanel'
export type NoteEditorProps = {
  noteId: string
  onSelectNote: (noteId: string | null) => void
}

export default function NoteEditor({ noteId, onSelectNote }: NoteEditorProps) {
  const {
    note,
    title,
    setTitle,
    setContent,
    isLoading,
    isSaving,
    isDirty,
  } = useNoteContent(noteId)

  const { notes } = useNotes()
  const notesRef = useRef(notes)
  notesRef.current = notes

  const noteLinkExtension = useMemo(
    () =>
      NoteLinkExtension.configure({
        excludeNoteId: noteId,
        getNotes: () =>
          notesRef.current.map((note) => ({
            id: note.id,
            label: note.title.trim() || '未命名笔记',
          })),
      }),
    [noteId],
  )

  const loadedNoteIdRef = useRef<string | null>(null)

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: 'text-blue-600 underline' },
        }),
        noteLinkExtension,
        Placeholder.configure({
          placeholder:
            '开始写作…（输入 [[ 链接笔记，# 空格变标题）',
        }),
        Typography,
      ],
      content: '',
      editorProps: {
        attributes: {
          class:
            'note-editor-content min-h-[calc(100vh-16rem)] max-w-none focus:outline-none',
        },
      },
      onUpdate: ({ editor: ed }) => {
        setContent(htmlToMarkdown(ed.getHTML()))
      },
    },
    [noteId, noteLinkExtension],
  )

  useEffect(() => {
    loadedNoteIdRef.current = null
  }, [noteId])

  useEffect(() => {
    if (!editor || !note || isLoading) return
    if (loadedNoteIdRef.current === noteId) return

    editor.commands.setContent(markdownToHtml(note.content), { emitUpdate: false })
    loadedNoteIdRef.current = noteId
  }, [editor, note, noteId, isLoading])

  const saveStatus = isSaving
    ? '保存中…'
    : isDirty
      ? '有未保存的更改'
      : `最后保存：${formatSavedTime(note?.updated_at)}`

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-2xl space-y-4 px-8">
          <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-8 py-8">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="无标题"
              className="mb-6 w-full border-none bg-transparent text-3xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
            />

            <EditorContent editor={editor} />
          </div>
        </div>

        <footer className="shrink-0 border-t border-gray-200 bg-white px-8 py-2.5">
          <div className="mx-auto flex max-w-3xl items-center justify-between text-xs text-gray-400">
            <span>{saveStatus}</span>
            <span className="hidden sm:inline text-gray-300">
              Markdown 快捷键：# 标题 · [[ 链接笔记 · - 列表
            </span>
          </div>
        </footer>
      </div>

      <NoteTagPanel noteId={noteId} />
      <NoteRightPanel noteId={noteId} onSelectNote={onSelectNote} />
    </div>
  )
}
