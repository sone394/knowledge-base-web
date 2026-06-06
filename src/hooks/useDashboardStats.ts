import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { queryKeys } from './queryKeys'

export type DailyNoteCount = {
  day: string
  count: number
}

export type TagFrequency = {
  tag_name: string
  usage_count: number
}

export type DashboardSummary = {
  total_notes: number
  weekly_edits: number
  total_tags: number
  total_links: number
  notes_this_week: number
}

export type DashboardStats = {
  dailyNotes: DailyNoteCount[]
  tagFrequency: TagFrequency[]
  summary: DashboardSummary
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const [dailyResult, tagsResult, summaryResult] = await Promise.all([
    supabase.rpc('get_dashboard_daily_notes', { days: 30 }),
    supabase.rpc('get_dashboard_tag_frequency', { result_limit: 10 }),
    supabase.rpc('get_dashboard_summary'),
  ])

  if (dailyResult.error) throw dailyResult.error
  if (tagsResult.error) throw tagsResult.error
  if (summaryResult.error) throw summaryResult.error

  const summaryRow = summaryResult.data?.[0]
  if (!summaryRow) {
    throw new Error('仪表盘汇总数据为空')
  }

  return {
    dailyNotes: (dailyResult.data ?? []).map((row) => ({
      day: row.day,
      count: Number(row.count),
    })),
    tagFrequency: (tagsResult.data ?? []).map((row) => ({
      tag_name: row.tag_name,
      usage_count: Number(row.usage_count),
    })),
    summary: {
      total_notes: Number(summaryRow.total_notes),
      weekly_edits: Number(summaryRow.weekly_edits),
      total_tags: Number(summaryRow.total_tags),
      total_links: Number(summaryRow.total_links),
      notes_this_week: Number(summaryRow.notes_this_week),
    },
  }
}

export function useDashboardStats() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: fetchDashboardStats,
    enabled: !!user,
  })

  return {
    dailyNotes: query.data?.dailyNotes ?? [],
    tagFrequency: query.data?.tagFrequency ?? [],
    summary: query.data?.summary ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
