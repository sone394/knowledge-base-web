import type { Editor } from '@tiptap/react'

type EditorToolbarProps = {
  editor: Editor | null
}

function ToolbarButton({
  onClick,
  active = false,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`touch-target rounded-md px-2 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-gray-200 dark:bg-gray-700" />
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800/50">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="加粗"
      >
        <strong className="text-xs font-bold">B</strong>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="斜体"
      >
        <em className="text-xs italic">I</em>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="一级标题"
      >
        <span className="text-xs font-semibold">H1</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="二级标题"
      >
        <span className="text-xs font-semibold">H2</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="三级标题"
      >
        <span className="text-xs font-semibold">H3</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="无序列表"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M3 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm3-8h11a1 1 0 110 2H6a1 1 0 110-2zm0 4h11a1 1 0 110 2H6a1 1 0 110-2zm0 4h11a1 1 0 110 2H6a1 1 0 110-2z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="有序列表"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M3 4.5a.5.5 0 01.8-.4L5 5.3V4a1 1 0 112 0v4a1 1 0 01-1 1H3a1 1 0 010-2h.5V5.7L3.2 4.9A.5.5 0 013 4.5zM3 10a1 1 0 011-1h.5V8.7l-.8.8a.5.5 0 11-.7-.7l1.5-1.4a1 1 0 011.5.9V10zm0 4.5a.5.5 0 01.8-.4L5 15.3V14a1 1 0 112 0v4a1 1 0 01-1 1H3a1 1 0 010-2h.5v-1.3l-.8.8a.5.5 0 11-.7-.7l1.5-1.4a1 1 0 011.5.9v1.5zM7 5h10a1 1 0 110 2H7a1 1 0 110-2zm0 4h10a1 1 0 110 2H7a1 1 0 110-2zm0 4h10a1 1 0 110 2H7a1 1 0 110-2z" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        title="代码块"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" d="M6 6l-4 4 4 4M14 6l4 4-4 4" />
        </svg>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="引用"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M4 5.5a2.5 2.5 0 115 0v2a2.5 2.5 0 01-5 0v-2zm7 0a2.5 2.5 0 115 0v2a2.5 2.5 0 01-5 0v-2zM3 14h5v1H3v-1zm7 0h5v1h-5v-1z" />
        </svg>
      </ToolbarButton>
    </div>
  )
}
