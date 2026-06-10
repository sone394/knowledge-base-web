import type { AnyExtension, Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import { CalloutExtension } from './calloutExtension'
import { CommentExtension } from './commentExtension'
import { MathBlockExtension, MathInlineExtension } from './mathExtension'

/** 块级图片默认可点击选中，便于删除 */
const SelectableImage = Image.extend({
  selectable: true,
})

export type CreateEditorExtensionsOptions = {
  noteLinkExtension: AnyExtension
  placeholder?: string
}

export function createEditorExtensions({
  noteLinkExtension,
  placeholder = '开始写作…（输入 [[ 链接笔记，# 空格变标题）',
}: CreateEditorExtensionsOptions): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-blue-600 underline' },
    }),
    SelectableImage.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: { class: 'note-editor-image' },
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    CalloutExtension,
    CommentExtension,
    MathInlineExtension,
    MathBlockExtension,
    noteLinkExtension,
    Placeholder.configure({ placeholder }),
    Typography,
  ]
}
