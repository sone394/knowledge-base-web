import { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import type { NoteTreeNode } from '../hooks/useNotes'
import NoteTreeRow, { type NoteTreeRowProps } from './NoteTreeRow'

type SwipeableNoteTreeRowProps = NoteTreeRowProps & {
  onPin?: (note: NoteTreeNode) => void
  onDelete?: (note: NoteTreeNode) => void
}

const ACTION_WIDTH = 72
const SWIPE_THRESHOLD = 48

export default function SwipeableNoteTreeRow({
  node,
  onPin,
  onDelete,
  ...rowProps
}: SwipeableNoteTreeRowProps) {
  const [offset, setOffset] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const close = () => {
    setOffset(0)
    setIsOpen(false)
  }

  const open = () => {
    const totalWidth = (onPin ? ACTION_WIDTH : 0) + (onDelete ? ACTION_WIDTH : 0)
    setOffset(-totalWidth)
    setIsOpen(true)
  }

  const handlers = useSwipeable({
    onSwiping: (event) => {
      if (rowProps.isRenaming) return

      const totalWidth =
        (onPin ? ACTION_WIDTH : 0) + (onDelete ? ACTION_WIDTH : 0)
      if (event.dir === 'Left') {
        const next = Math.max(-totalWidth, event.deltaX)
        setOffset(next)
      } else if (event.dir === 'Right' && isOpen) {
        const next = Math.min(0, -totalWidth + event.deltaX)
        setOffset(next)
      }
    },
    onSwipedLeft: (event) => {
      if (rowProps.isRenaming) return
      if (Math.abs(event.deltaX) >= SWIPE_THRESHOLD) open()
      else close()
    },
    onSwipedRight: () => {
      if (rowProps.isRenaming) return
      close()
    },
    trackMouse: false,
    preventScrollOnSwipe: true,
  })

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex">
        {onPin && (
          <button
            type="button"
            onClick={() => {
              onPin(node)
              close()
            }}
            className="touch-target flex w-[4.5rem] items-center justify-center bg-amber-500 text-white"
            aria-label="置顶"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => {
              onDelete(node)
              close()
            }}
            className="touch-target flex w-[4.5rem] items-center justify-center bg-red-500 text-white"
            aria-label="删除"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        )}
      </div>

      <div
        {...handlers}
        className="relative bg-white dark:bg-gray-900"
        style={{
          transform: `translateX(${offset}px)`,
          transition: offset === 0 || isOpen ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        <NoteTreeRow node={node} {...rowProps} />
      </div>
    </div>
  )
}
