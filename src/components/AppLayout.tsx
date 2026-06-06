import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Sidebar, { type SidebarProps } from './Sidebar'
import MobileBottomNav from './MobileBottomNav'
import { useIsMobile } from '../hooks/useMediaQuery'

export type AppLayoutProps = SidebarProps & {
  children: ReactNode
  /** 移动端顶栏标题 */
  mobileTitle?: string
  /** 顶栏右侧附加内容（桌面端与移动端均可用） */
  headerExtra?: ReactNode
  /** 是否显示侧边栏 */
  showSidebar?: boolean
}

export default function AppLayout({
  children,
  mobileTitle,
  headerExtra,
  showSidebar = true,
  selectedNoteId,
  onSelectNote,
}: AppLayoutProps) {
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const openDrawer = useCallback(() => setDrawerOpen(true), [])

  const handleSelectNote = useCallback(
    (noteId: string | null) => {
      onSelectNote(noteId)
      if (isMobile) closeDrawer()
    },
    [onSelectNote, isMobile, closeDrawer],
  )

  useEffect(() => {
    if (!isMobile) setDrawerOpen(false)
  }, [isMobile])

  useEffect(() => {
    if (!drawerOpen) return

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  return (
    <div className="flex h-[100dvh] bg-gray-50 dark:bg-gray-950">
      {showSidebar && (
        <div className="hidden h-full w-64 shrink-0 md:flex">
          <Sidebar
            selectedNoteId={selectedNoteId}
            onSelectNote={handleSelectNote}
          />
        </div>
      )}

      {showSidebar && drawerOpen && isMobile && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label="关闭侧边栏"
            onClick={closeDrawer}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[min(85vw,18rem)] shadow-xl md:hidden">
            <Sidebar
              selectedNoteId={selectedNoteId}
              onSelectNote={handleSelectNote}
              onClose={closeDrawer}
              isDrawer
            />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {showSidebar && isMobile && (
          <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900 md:hidden">
            <button
              type="button"
              onClick={openDrawer}
              className="touch-target -ml-1 flex items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="打开笔记目录"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            {mobileTitle && (
              <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                {mobileTitle}
              </h1>
            )}
            {headerExtra && (
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {headerExtra}
              </div>
            )}
          </header>
        )}

        <div className="flex min-h-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  )
}
