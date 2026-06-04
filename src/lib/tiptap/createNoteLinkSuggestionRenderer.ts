import { ReactRenderer } from '@tiptap/react'
import type { SuggestionProps } from '@tiptap/suggestion'
import NoteLinkSuggestionList, {
  type NoteLinkSuggestionListRef,
} from '../../components/NoteLinkSuggestionList'
import type { NoteLinkItem } from './noteLinkExtension'

function updatePosition(
  element: HTMLElement,
  clientRect?: (() => DOMRect | null) | null,
) {
  const rect = clientRect?.()
  if (!rect) return

  element.style.left = `${rect.left}px`
  element.style.top = `${rect.bottom + 6}px`
}

export function createNoteLinkSuggestionRenderer() {
  let renderer: ReactRenderer<NoteLinkSuggestionListRef> | null = null
  let container: HTMLDivElement | null = null

  return {
    onStart: (props: SuggestionProps<NoteLinkItem, NoteLinkItem>) => {
      renderer = new ReactRenderer(NoteLinkSuggestionList, {
        props,
        editor: props.editor,
      })

      container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.zIndex = '1000'
      container.appendChild(renderer.element)
      document.body.appendChild(container)
      updatePosition(container, props.clientRect)
    },

    onUpdate: (props: SuggestionProps<NoteLinkItem, NoteLinkItem>) => {
      renderer?.updateProps(props)
      if (container) updatePosition(container, props.clientRect)
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === 'Escape') {
        return true
      }

      return renderer?.ref?.onKeyDown(props.event) ?? false
    },

    onExit: () => {
      renderer?.destroy()
      container?.remove()
      renderer = null
      container = null
    },
  }
}
