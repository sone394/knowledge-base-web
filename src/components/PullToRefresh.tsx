import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from 'react'

type PullToRefreshProps = {
  onRefresh: () => Promise<unknown>
  children: ReactNode
  className?: string
  disabled?: boolean
}

const THRESHOLD = 72
const MAX_PULL = 96

export default function PullToRefresh({
  onRefresh,
  children,
  className = '',
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const reset = useCallback(() => {
    pullingRef.current = false
    setPullDistance(0)
  }, [])

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    startYRef.current = event.touches[0].clientY
    pullingRef.current = true
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!pullingRef.current || disabled || isRefreshing) return
    const container = containerRef.current
    if (!container || container.scrollTop > 0) {
      reset()
      return
    }

    const delta = event.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      setPullDistance(0)
      return
    }

    event.preventDefault()
    setPullDistance(Math.min(delta * 0.5, MAX_PULL))
  }

  const handleTouchEnd = async () => {
    if (!pullingRef.current || disabled) return

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(THRESHOLD)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        reset()
      }
      return
    }

    reset()
  }

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const showIndicator = pullDistance > 0 || isRefreshing

  return (
    <div className={`relative min-h-0 flex-1 ${className}`}>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-center overflow-hidden transition-[height,opacity] duration-200 ${
          showIndicator ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ height: showIndicator ? Math.max(pullDistance, isRefreshing ? THRESHOLD : 0) : 0 }}
        aria-hidden={!showIndicator}
      >
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
            style={
              !isRefreshing
                ? { transform: `rotate(${progress * 180}deg)` }
                : undefined
            }
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.36-6.36M20 15a9 9 0 01-15.36 6.36"
            />
          </svg>
          <span>
            {isRefreshing
              ? '同步中…'
              : progress >= 1
                ? '松开刷新'
                : '下拉同步'}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-y-contain"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pullingRef.current ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => void handleTouchEnd()}
        onTouchCancel={reset}
      >
        {children}
      </div>
    </div>
  )
}
