import { mergeAttributes, Node } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import { createNoteLinkSuggestionRenderer } from './createNoteLinkSuggestionRenderer'
import { findWikiLinkMatch } from './findWikiLinkMatch'
import { NoteLinkView } from './NoteLinkView'

export type NoteLinkItem = {
  id: string
  label: string
}

export type NoteLinkOptions = {
  getNotes: () => NoteLinkItem[]
  /** 排除当前笔记，避免自引用 */
  excludeNoteId?: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteLink: {
      setNoteLink: (attributes: { id: string; label: string }) => ReturnType
    }
  }
}

export const NoteLinkExtension = Node.create<NoteLinkOptions>({
  name: 'noteLink',
  priority: 1000,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,

  addOptions() {
    return {
      getNotes: () => [] as NoteLinkItem[],
      excludeNoteId: null,
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-note-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {}
          return { 'data-note-id': attributes.id }
        },
      },
      label: {
        default: null,
        parseHTML: (element) =>
          element.textContent || element.getAttribute('data-label'),
        renderHTML: (attributes) => {
          if (!attributes.label) return {}
          return { 'data-label': attributes.label }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-note-id]',
      },
      {
        tag: 'a[href^="/note/"]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false
          const href = element.getAttribute('href') ?? ''
          const match = href.match(/^\/note\/([^/?#]+)/)
          if (!match) return false
          return {
            id: match[1],
            label: element.textContent || '未命名笔记',
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const id = node.attrs.id as string
    const label = (node.attrs.label as string) || '未命名笔记'

    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-note-id': id,
        'data-type': 'note-link',
        href: `/note/${id}`,
        class: 'note-internal-link',
      }),
      label,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteLinkView)
  },

  addCommands() {
    return {
      setNoteLink:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: attributes,
          }),
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '[',
        pluginKey: new PluginKey('noteLinkSuggestion'),
        allowSpaces: true,
        allowedPrefixes: [' ', '\n', '\0'],
        findSuggestionMatch: findWikiLinkMatch,
        items: ({ query }) => {
          const notes = this.options.getNotes()
          const excludeId = this.options.excludeNoteId
          const filtered = excludeId
            ? notes.filter((note) => note.id !== excludeId)
            : notes

          const q = query.toLowerCase().trim()
          if (!q) return filtered.slice(0, 15)

          return filtered
            .filter((note) => note.label.toLowerCase().includes(q))
            .slice(0, 15)
        },
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, {
              type: this.name,
              attrs: { id: props.id, label: props.label },
            })
            .insertContent(' ')
            .run()
        },
        render: createNoteLinkSuggestionRenderer,
      }),
    ]
  },
})
