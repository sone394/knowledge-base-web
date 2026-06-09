/**
 * SM-2 简化版间隔重复算法
 * rating: 0=困难, 1=一般, 2=简单
 */

export type ReviewRating = 0 | 1 | 2

export const REVIEW_RATING_OPTIONS: {
  value: ReviewRating
  label: string
  description: string
  color: string
}[] = [
  {
    value: 0,
    label: '困难',
    description: '几乎忘了，明天再复习',
    color: 'red',
  },
  {
    value: 1,
    label: '一般',
    description: '有些模糊，按正常间隔',
    color: 'amber',
  },
  {
    value: 2,
    label: '简单',
    description: '记得很清楚，延长间隔',
    color: 'green',
  },
]

export function startOfLocalDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfLocalDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function addDays(date: Date, days: number): Date {
  const result = startOfLocalDay(date)
  result.setDate(result.getDate() + days)
  return result
}

export function toReviewDateIso(date: Date): string {
  return date.toISOString()
}

/** 开启复习计划时的初始状态 */
export function getInitialReviewState() {
  return {
    needs_review: true,
    review_interval: 1,
    review_count: 0,
    next_review_date: toReviewDateIso(startOfLocalDay()),
  }
}

/** 关闭复习计划 */
export function getDisabledReviewState() {
  return {
    needs_review: false,
    review_interval: 0,
    next_review_date: null as string | null,
  }
}

/**
 * 根据自评计算下次复习状态
 * - 困难：间隔重置为 1 天
 * - 一般：第 1 次 1 天，第 2 次 3 天，之后 interval × 2
 * - 简单：第 1 次 3 天，之后 interval × 2.5（取整）
 */
export function computeNextReviewState(
  currentInterval: number,
  reviewCount: number,
  rating: ReviewRating,
): {
  review_interval: number
  review_count: number
  next_review_date: string
} {
  const newReviewCount = reviewCount + 1
  let newInterval: number

  switch (rating) {
    case 0:
      newInterval = 1
      break
    case 1:
      if (newReviewCount <= 1) {
        newInterval = 1
      } else if (newReviewCount === 2) {
        newInterval = 3
      } else {
        newInterval = Math.max(1, Math.round(currentInterval * 2))
      }
      break
    case 2:
      if (newReviewCount <= 1) {
        newInterval = 3
      } else {
        newInterval = Math.max(1, Math.round(currentInterval * 2.5))
      }
      break
    default:
      newInterval = 1
  }

  const nextReviewDate = addDays(new Date(), newInterval)

  return {
    review_interval: newInterval,
    review_count: newReviewCount,
    next_review_date: toReviewDateIso(nextReviewDate),
  }
}

/** 到期日与今天相差的天数（负数为逾期） */
export function getReviewDueDayOffset(iso: string | null): number | null {
  if (!iso) return null
  const due = startOfLocalDay(new Date(iso))
  const today = startOfLocalDay()
  return Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
}

export function isReviewOverdue(iso: string | null): boolean {
  const offset = getReviewDueDayOffset(iso)
  return offset !== null && offset < 0
}

/** 用于排序的到期日时间戳（升序：越早到期越靠前，逾期优先） */
export function getReviewDueSortKey(iso: string | null): number {
  if (!iso) return 0
  return startOfLocalDay(new Date(iso)).getTime()
}

type ReviewDueSortable = {
  next_review_date: string | null
  title?: string | null
}

/** 按到期日升序排列，同日按标题排序 */
export function sortNotesByReviewDueDate<T extends ReviewDueSortable>(
  notes: T[],
): T[] {
  return [...notes].sort((a, b) => {
    const dateDiff =
      getReviewDueSortKey(a.next_review_date) -
      getReviewDueSortKey(b.next_review_date)
    if (dateDiff !== 0) return dateDiff
    return (a.title ?? '').localeCompare(b.title ?? '', 'zh-CN')
  })
}

export function formatReviewDueDate(iso: string | null): string {
  if (!iso) return '未安排'
  const diffDays = getReviewDueDayOffset(iso)
  if (diffDays === null) return '未安排'

  if (diffDays < 0) return `逾期 ${Math.abs(diffDays)} 天`
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'

  const date = new Date(iso)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
