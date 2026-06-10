import { Mark, mergeAttributes } from '@tiptap/core'

export const CommentExtension = Mark.create({
  name: 'comment',
  inclusive: true,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-comment') ?? '',
        renderHTML: (attributes) => {
          if (!attributes.text) return {}
          return { 'data-comment': attributes.text, title: attributes.text }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'mark[data-comment]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(HTMLAttributes, {
        class: 'editor-comment',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setComment:
        (text: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { text }),
      toggleComment:
        (text: string) =>
        ({ commands }) =>
          commands.toggleMark(this.name, { text }),
      unsetComment:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})
