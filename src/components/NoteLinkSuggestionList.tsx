import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import type { NoteLinkItem } from '../lib/tiptap/noteLinkExtension'

export type NoteLinkSuggestionListProps = {
  items: NoteLinkItem[]
  command: (item: NoteLinkItem) => void
}

export type NoteLinkSuggestionListRef = {
  onKeyDown: (event: KeyboardEvent) => boolean
}

const NoteLinkSuggestionList = forwardRef<
  NoteLinkSuggestionListRef,
  NoteLinkSuggestionListProps
>(function NoteLinkSuggestionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((index) => (index + items.length - 1) % items.length)
        return true
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((index) => (index + 1) % items.length)
        return true
      }

      if (event.key === 'Enter') {
        const item = items[selectedIndex]
        if (item) command(item)
        return true
      }

      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="note-link-suggestion rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg">
        没有匹配的笔记
      </div>
    )
  }

  return (
    <div className="note-link-suggestion max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={`flex w-full px-3 py-2 text-left text-sm transition-colors ${
            index === selectedIndex
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          onMouseEnter={() => setSelectedIndex(index)}
          onMouseDown={(event) => {
            event.preventDefault()
            command(item)
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
})

export default NoteLinkSuggestionList
