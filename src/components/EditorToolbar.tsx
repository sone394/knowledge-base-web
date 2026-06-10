import { useCallback, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { toggleHeadingOnCurrentLine } from '../lib/tiptap/headingCommands'
import type { CalloutType } from '../lib/tiptap/calloutExtension'
import {
  activateFormatPainter,
  captureFormat,
  clearFormatting,
  deactivateFormatPainter,
  isFormatPainterActive,
} from '../lib/formatPainter'
import { isImageFile, uploadNoteAsset } from '../lib/uploads'
import { useAuth } from '../context/AuthContext'
import ToolbarDropdown, { DropdownItem } from './ToolbarDropdown'

type EditorToolbarProps = {
  editor: Editor | null
  onFocusMode?: () => void
}

const TEXT_COLORS = [
  { label: '默认', value: '' },
  { label: '红色', value: '#dc2626' },
  { label: '橙色', value: '#ea580c' },
  { label: '绿色', value: '#16a34a' },
  { label: '蓝色', value: '#2563eb' },
  { label: '紫色', value: '#7c3aed' },
  { label: '灰色', value: '#6b7280' },
]

const HIGHLIGHT_COLORS = [
  { label: '黄色', value: '#fef08a' },
  { label: '绿色', value: '#bbf7d0' },
  { label: '蓝色', value: '#bfdbfe' },
  { label: '粉色', value: '#fbcfe8' },
  { label: '清除', value: '' },
]

const CALLOUT_TYPES: { type: CalloutType; label: string }[] = [
  { type: 'info', label: '信息提示' },
  { type: 'tip', label: '技巧建议' },
  { type: 'warning', label: '注意警告' },
  { type: 'danger', label: '危险提醒' },
]

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`touch-target rounded-md px-2 py-1.5 text-sm transition-colors disabled:opacity-40 ${
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

function DeleteIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h8M9 7V5h2v2M7 7l1 10h4l1-10" />
    </svg>
  )
}

type EditorToolbarContentProps = {
  editor: Editor
  onFocusMode?: () => void
}

function EditorToolbarContent({ editor, onFocusMode }: EditorToolbarContentProps) {
  const { user } = useAuth()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [painterActive, setPainterActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  const run = useCallback(
    (fn: () => void) => {
      if (!editor) return
      fn()
    },
    [editor],
  )

  const promptText = (message: string, defaultValue = '') => {
    const value = window.prompt(message, defaultValue)
    return value?.trim() ?? null
  }

  const handleFormatPainter = () => {
    if (!editor) return
    if (painterActive) {
      deactivateFormatPainter()
      setPainterActive(false)
      return
    }
    const snapshot = captureFormat(editor)
    if (!snapshot) return
    activateFormatPainter(snapshot)
    setPainterActive(true)
  }

  const handleImageUpload = async (file: File) => {
    if (!editor || !user) return
    setUploading(true)
    try {
      const url = await uploadNoteAsset(file, user.id)
      editor.chain().focus().setImage({ src: url, alt: file.name }).run()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!editor || !user) return
    setUploading(true)
    try {
      const url = await uploadNoteAsset(file, user.id)
      const label = file.name
      editor
        .chain()
        .focus()
        .insertContent(
          `<a href="${url}" class="note-attachment" download="${label}">📎 ${label}</a>`,
        )
        .run()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const { imageActive, tableActive } = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      imageActive: ed.isActive('image'),
      tableActive: ed.isActive('table'),
    }),
  })

  const headingActive = (level: number) =>
    editor.isActive('heading', { level })

  return (
    <div className="mb-4 flex flex-wrap items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800/50">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleImageUpload(file)
          event.target.value = ''
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            if (isImageFile(file)) {
              void handleImageUpload(file)
            } else {
              void handleFileUpload(file)
            }
          }
          event.target.value = ''
        }}
      />

      {/* 撤销 / 重做 */}
      <ToolbarButton
        onClick={() => run(() => editor.chain().focus().undo().run())}
        disabled={!editor.can().undo()}
        title="撤销 (Ctrl+Z)"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 5l-4 4 4 4M3 9h11a4 4 0 010 8h-1" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => run(() => editor.chain().focus().redo().run())}
        disabled={!editor.can().redo()}
        title="重做 (Ctrl+Y)"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l4 4-4 4M17 9H6a4 4 0 000 8h1" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* 格式刷 / 清除格式 */}
      <ToolbarButton
        onClick={handleFormatPainter}
        active={painterActive || isFormatPainterActive()}
        title="格式刷"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M14.5 2a2.5 2.5 0 012.45 2.04l.55 3.01a1 1 0 01-.2.82l-7.1 7.1a2 2 0 01-2.83 0l-1.17-1.17a2 2 0 010-2.83l7.1-7.1a1 1 0 01.82-.2l3.01.55A2.5 2.5 0 0114.5 2zM4 14l2 2-2 2H2v-2l2-2z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => run(() => clearFormatting(editor))}
        title="清除格式"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M8.5 3.5l-5 9h3.5l.5 3h2l.5-3H14l-5-9zm1 5.5L11 7l1.5 2H9.5zM16 16H4v2h12v-2z" />
        </svg>
      </ToolbarButton>

      <Divider />

      {/* 标题 */}
      <ToolbarButton
        onClick={() => run(() => toggleHeadingOnCurrentLine(editor, 1))}
        active={headingActive(1)}
        title="一级标题"
      >
        <span className="text-xs font-semibold">H1</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => run(() => toggleHeadingOnCurrentLine(editor, 2))}
        active={headingActive(2)}
        title="二级标题"
      >
        <span className="text-xs font-semibold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => run(() => toggleHeadingOnCurrentLine(editor, 3))}
        active={headingActive(3)}
        title="三级标题"
      >
        <span className="text-xs font-semibold">H3</span>
      </ToolbarButton>
      <ToolbarDropdown
        title="更多标题"
        active={headingActive(4) || headingActive(5) || headingActive(6)}
        label={<span className="text-xs font-semibold">Hn</span>}
      >
        {[4, 5, 6].map((level) => (
          <DropdownItem
            key={level}
            active={headingActive(level)}
            onClick={() =>
              run(() => toggleHeadingOnCurrentLine(editor, level as 1 | 2 | 3 | 4 | 5 | 6))
            }
          >
            H{level} 标题
          </DropdownItem>
        ))}
        <DropdownItem
          onClick={() => run(() => editor.chain().focus().setParagraph().run())}
        >
          正文段落
        </DropdownItem>
      </ToolbarDropdown>

      <Divider />

      {/* 文字样式 */}
      <ToolbarButton
        onClick={() => run(() => editor.chain().focus().toggleBold().run())}
        active={editor.isActive('bold')}
        title="加粗 (Ctrl+B)"
      >
        <strong className="text-xs font-bold">B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
        active={editor.isActive('italic')}
        title="斜体 (Ctrl+I)"
      >
        <em className="text-xs italic">I</em>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => run(() => editor.chain().focus().toggleStrike().run())}
        active={editor.isActive('strike')}
        title="删除线"
      >
        <span className="text-xs line-through">S</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}
        active={editor.isActive('underline')}
        title="下划线 (Ctrl+U)"
      >
        <span className="text-xs underline">U</span>
      </ToolbarButton>

      <Divider />

      {/* 插入块 */}
      <ToolbarDropdown
        title="插入块"
        label={
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M3 4h14v3H3V4zm0 5h14v3H3V9zm0 5h14v3H3v-3z" />
          </svg>
        }
      >
        {CALLOUT_TYPES.map(({ type, label }) => (
          <DropdownItem
            key={type}
            onClick={() =>
              run(() => editor.chain().focus().setCallout(type).run())
            }
          >
            {label}
          </DropdownItem>
        ))}
        <DropdownItem
          onClick={() =>
            run(() => editor.chain().focus().setHorizontalRule().run())
          }
        >
          分隔线
        </DropdownItem>
      </ToolbarDropdown>

      {/* 链接 / 附件 / 表格 */}
      <ToolbarButton
        onClick={() => {
          const url = promptText('输入链接地址 (https://...)')
          if (!url) return
          run(() =>
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run(),
          )
        }}
        active={editor.isActive('link')}
        title="插入链接"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" d="M8.5 10.5a3 3 0 014-4l2-2a3 3 0 114 4l-1 1M11.5 9.5a3 3 0 01-4 4l-2 2a3 3 0 11-4-4l1-1" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title="插入附件"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" d="M7.5 10.5l2.5-3 2.5 3M10 3v10M5 14.5h10a2 2 0 002-2v-1H3v1a2 2 0 002 2z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => imageInputRef.current?.click()}
        disabled={uploading}
        title="插入图片"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="4" width="14" height="12" rx="1.5" />
          <circle cx="7.5" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
          <path strokeLinecap="round" d="M3 14l3.5-3.5 3 3L14 9l3 3" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          run(() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
          )
        }
        active={editor.isActive('table')}
        title="插入表格"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M3 4h14v12H3V4zm2 2v3h4V6H5zm6 0v3h4V6h-4zM5 11v3h4v-3H5zm6 0v3h4v-3h-4z" />
        </svg>
      </ToolbarButton>

      {imageActive && (
        <>
          <Divider />
          <ToolbarButton
            onClick={() => run(() => editor.chain().focus().deleteSelection().run())}
            title="删除图片"
          >
            <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
              <DeleteIcon />
              删图
            </span>
          </ToolbarButton>
        </>
      )}

      {tableActive && (
        <>
          <Divider />
          <ToolbarDropdown
            title="表格操作"
            active
            label={<span className="text-xs font-semibold">表格</span>}
          >
            <DropdownItem
              disabled={!editor.can().deleteRow()}
              onClick={() => run(() => editor.chain().focus().deleteRow().run())}
            >
              删除当前行
            </DropdownItem>
            <DropdownItem
              disabled={!editor.can().deleteColumn()}
              onClick={() => run(() => editor.chain().focus().deleteColumn().run())}
            >
              删除当前列
            </DropdownItem>
            <DropdownItem
              disabled={!editor.can().deleteTable()}
              onClick={() => run(() => editor.chain().focus().deleteTable().run())}
            >
              <span className="text-red-600 dark:text-red-400">删除整张表格</span>
            </DropdownItem>
          </ToolbarDropdown>
        </>
      )}

      <ToolbarButton
        onClick={() => run(() => editor.chain().focus().toggleTaskList().run())}
        active={editor.isActive('taskList')}
        title="待办清单"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="5" cy="6" r="2.25" />
          <path strokeLinecap="round" d="M9 6h8M5 14h12" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 14l1.5 1.5L9 12" />
        </svg>
      </ToolbarButton>

      {/* 批注 / 引用 */}
      <ToolbarDropdown
        title="批注与引用"
        label={
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H8l-3 3V5a1 1 0 011-1z" />
          </svg>
        }
      >
        <DropdownItem
          onClick={() => {
            const text = promptText('批注内容', '备注')
            if (!text) return
            run(() => editor.chain().focus().setComment(text).run())
          }}
        >
          添加批注
        </DropdownItem>
        <DropdownItem
          onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())}
          active={editor.isActive('blockquote')}
        >
          引用块
        </DropdownItem>
      </ToolbarDropdown>

      {/* 公式 */}
      <ToolbarDropdown
        title="插入公式"
        label={<span className="text-xs font-serif">∑</span>}
      >
        <DropdownItem
          onClick={() => {
            const latex = promptText('行内公式 (LaTeX)', 'E=mc^2')
            if (!latex) return
            run(() => editor.chain().focus().insertMathInline(latex).run())
          }}
        >
          行内公式
        </DropdownItem>
        <DropdownItem
          onClick={() => {
            const latex = promptText('块级公式 (LaTeX)', '\\sum_{i=1}^{n} i')
            if (!latex) return
            run(() => editor.chain().focus().insertMathBlock(latex).run())
          }}
        >
          块级公式
        </DropdownItem>
      </ToolbarDropdown>

      <Divider />

      {/* 列表 */}
      <ToolbarDropdown
        title="列表"
        active={editor.isActive('bulletList') || editor.isActive('orderedList')}
        label={
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M3 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm3-8h11a1 1 0 110 2H6a1 1 0 110-2zm0 4h11a1 1 0 110 2H6a1 1 0 110-2zm0 4h11a1 1 0 110 2H6a1 1 0 110-2z" />
          </svg>
        }
      >
        <DropdownItem
          active={editor.isActive('bulletList')}
          onClick={() => run(() => editor.chain().focus().toggleBulletList().run())}
        >
          无序列表
        </DropdownItem>
        <DropdownItem
          active={editor.isActive('orderedList')}
          onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())}
        >
          有序列表
        </DropdownItem>
        <DropdownItem
          active={editor.isActive('taskList')}
          onClick={() => run(() => editor.chain().focus().toggleTaskList().run())}
        >
          待办清单
        </DropdownItem>
      </ToolbarDropdown>

      {/* 对齐 */}
      <ToolbarDropdown
        title="对齐方式"
        label={
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M3 5h14v1.5H3V5zm0 4h10v1.5H3V9zm0 4h14v1.5H3V13zm0 4h8v1.5H3V17z" />
          </svg>
        }
      >
        {(
          [
            ['left', '左对齐'],
            ['center', '居中'],
            ['right', '右对齐'],
            ['justify', '两端对齐'],
          ] as const
        ).map(([align, label]) => (
          <DropdownItem
            key={align}
            active={editor.isActive({ textAlign: align })}
            onClick={() =>
              run(() => editor.chain().focus().setTextAlign(align).run())
            }
          >
            {label}
          </DropdownItem>
        ))}
      </ToolbarDropdown>

      <Divider />

      {/* 颜色 */}
      <ToolbarDropdown
        title="文字颜色"
        label={
          <span className="text-xs font-bold underline decoration-green-500 decoration-2 underline-offset-2">
            A
          </span>
        }
      >
        {TEXT_COLORS.map(({ label, value }) => (
          <DropdownItem
            key={label}
            onClick={() =>
              run(() => {
                if (!value) {
                  editor.chain().focus().unsetColor().run()
                } else {
                  editor.chain().focus().setColor(value).run()
                }
              })
            }
          >
            <span
              className="inline-block h-3 w-3 rounded-full border border-gray-200"
              style={{ backgroundColor: value || 'transparent' }}
            />
            {label}
          </DropdownItem>
        ))}
      </ToolbarDropdown>

      <ToolbarDropdown
        title="高亮颜色"
        label={
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M15.5 2l2.5 2.5-9 9-3.5 1 1-3.5 9-9zM3 17h14v1.5H3V17z" />
          </svg>
        }
      >
        {HIGHLIGHT_COLORS.map(({ label, value }) => (
          <DropdownItem
            key={label}
            onClick={() =>
              run(() => {
                if (!value) {
                  editor.chain().focus().unsetHighlight().run()
                } else {
                  editor.chain().focus().setHighlight({ color: value }).run()
                }
              })
            }
          >
            <span
              className="inline-block h-3 w-3 rounded border border-gray-200"
              style={{ backgroundColor: value || 'transparent' }}
            />
            {label}
          </DropdownItem>
        ))}
      </ToolbarDropdown>

      <Divider />

      {/* 代码块 */}
      <ToolbarButton
        onClick={() => run(() => editor.chain().focus().toggleCodeBlock().run())}
        active={editor.isActive('codeBlock')}
        title="代码块"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" d="M6 6l-4 4 4 4M14 6l4 4-4 4" />
        </svg>
      </ToolbarButton>

      {onFocusMode && (
        <>
          <Divider />
          <ToolbarButton onClick={onFocusMode} title="专注模式">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path strokeLinecap="round" d="M3 7V5a2 2 0 012-2h2M13 3h2a2 2 0 012 2v2M17 13v2a2 2 0 01-2 2h-2M7 17H5a2 2 0 01-2-2v-2" />
            </svg>
          </ToolbarButton>
        </>
      )}
    </div>
  )
}

export default function EditorToolbar({
  editor,
  onFocusMode,
}: EditorToolbarProps) {
  if (!editor) return null
  return <EditorToolbarContent editor={editor} onFocusMode={onFocusMode} />
}
