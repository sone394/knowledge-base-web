import { useEffect, useRef, useState, type ReactNode } from 'react'

type ToolbarDropdownProps = {
  label: ReactNode
  title: string
  active?: boolean
  children: ReactNode
  align?: 'left' | 'right'
}

export default function ToolbarDropdown({
  label,
  title,
  active = false,
  children,
  align = 'left',
}: ToolbarDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`touch-target flex items-center gap-0.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
          active || open
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
        }`}
      >
        {label}
        <svg viewBox="0 0 12 12" className="h-3 w-3 opacity-60" fill="currentColor" aria-hidden>
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute top-full z-30 mt-1 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  onClick,
  active = false,
  disabled = false,
  danger = false,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
          : active
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60'
      }`}
    >
      {children}
    </button>
  )
}

export function DropdownDivider() {
  return (
    <div
      role="separator"
      className="my-1 border-t border-gray-100 dark:border-gray-700"
    />
  )
}
