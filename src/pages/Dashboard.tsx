import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AppLayout from '../components/AppLayout'
import { useDashboardStats } from '../hooks/useDashboardStats'

type StatCardProps = {
  label: string
  value: number | string
  hint?: string
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  )
}

function formatDayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00`)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { dailyNotes, tagFrequency, summary, isLoading, isError, refetch } =
    useDashboardStats()

  const chartDailyNotes = useMemo(
    () =>
      dailyNotes.map((item) => ({
        ...item,
        label: formatDayLabel(item.day),
      })),
    [dailyNotes],
  )

  const chartTagFrequency = useMemo(
    () =>
      tagFrequency.map((item) => ({
        ...item,
        shortName:
          item.tag_name.length > 8
            ? `${item.tag_name.slice(0, 8)}…`
            : item.tag_name,
      })),
    [tagFrequency],
  )

  const handleSelectNote = (noteId: string | null) => {
    if (noteId) navigate(`/note/${noteId}`)
    else navigate('/notes/edit')
  }

  const axisColor = '#9ca3af'
  const gridColor = 'rgba(156, 163, 175, 0.2)'
  const lineColor = '#3b82f6'
  const barColor = '#6366f1'

  return (
    <AppLayout mobileTitle="仪表盘" onSelectNote={handleSelectNote}>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                数据概览
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                近 30 天笔记创建趋势与标签使用统计
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="touch-target self-start rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
            >
              刷新数据
            </button>
          </header>

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <p className="text-sm text-gray-500">加载统计数据…</p>
              </div>
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-900 dark:bg-red-950/30">
              <p className="text-sm text-red-600 dark:text-red-400">
                加载统计数据失败，请确认已在 Supabase 执行仪表盘 SQL 迁移
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="touch-target mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                重试
              </button>
            </div>
          )}

          {!isLoading && !isError && summary && (
            <>
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label="总笔记数" value={summary.total_notes} />
                <StatCard
                  label="本周编辑次数"
                  value={summary.weekly_edits}
                  hint="基于历史版本记录"
                />
                <StatCard label="总标签数" value={summary.total_tags} />
                <StatCard label="双向链接数" value={summary.total_links} />
                <StatCard
                  label="本周新增"
                  value={summary.notes_this_week}
                  hint="本周一至今日"
                />
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    近 30 天每日新增笔记
                  </h2>
                  {chartDailyNotes.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-400">
                      暂无数据
                    </p>
                  ) : (
                    <div className="h-64 w-full sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartDailyNotes}
                          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: axisColor }}
                            interval="preserveStartEnd"
                            minTickGap={24}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: axisColor }}
                            width={32}
                          />
                          <Tooltip
                            labelFormatter={(_, payload) => {
                              const item = payload?.[0]?.payload as
                                | { day: string }
                                | undefined
                              return item?.day ?? ''
                            }}
                            formatter={(value) => [value, '新增笔记']}
                            contentStyle={{
                              borderRadius: '0.5rem',
                              border: '1px solid #e5e7eb',
                              fontSize: '12px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            name="新增笔记"
                            stroke={lineColor}
                            strokeWidth={2}
                            dot={{ r: 2, fill: lineColor }}
                            activeDot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    标签使用频次 Top 10
                  </h2>
                  {chartTagFrequency.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-gray-400">暂无标签数据</p>
                      <Link
                        to="/notes/edit"
                        className="touch-target mt-3 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        去创建笔记并添加标签
                      </Link>
                    </div>
                  ) : (
                    <div className="h-64 w-full sm:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartTagFrequency}
                          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                          <XAxis
                            dataKey="shortName"
                            tick={{ fontSize: 11, fill: axisColor }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={56}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: axisColor }}
                            width={32}
                          />
                          <Tooltip
                            labelFormatter={(_, payload) => {
                              const item = payload?.[0]?.payload as
                                | { tag_name: string }
                                | undefined
                              return item?.tag_name ?? ''
                            }}
                            formatter={(value) => [value, '使用次数']}
                            contentStyle={{
                              borderRadius: '0.5rem',
                              border: '1px solid #e5e7eb',
                              fontSize: '12px',
                            }}
                          />
                          <Bar
                            dataKey="usage_count"
                            name="使用次数"
                            fill={barColor}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </AppLayout>
  )
}
