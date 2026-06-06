-- 仪表盘统计 RPC 函数
-- 在 Supabase Dashboard → SQL Editor 中执行，或通过 supabase db push 应用

-- ---------------------------------------------------------------------------
-- 近 N 天每日新增笔记数（含零值日期，便于折线图展示）
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_daily_notes(days integer default 30)
returns table (
  day date,
  count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with date_series as (
    select generate_series(
      (current_date - (greatest(days, 1) - 1)),
      current_date,
      '1 day'::interval
    )::date as day
  ),
  daily_counts as (
    select
      (created_at at time zone 'UTC')::date as day,
      count(*)::bigint as count
    from public.notes
    where user_id = auth.uid()
      and deleted_at is null
      and created_at >= (current_date - (greatest(days, 1) - 1))
    group by 1
  )
  select
    ds.day,
    coalesce(dc.count, 0)::bigint as count
  from date_series ds
  left join daily_counts dc on dc.day = ds.day
  order by ds.day;
$$;

comment on function public.get_dashboard_daily_notes(integer) is
  '仪表盘：近 N 天每日新增笔记数（仅当前用户、未删除笔记）';

-- ---------------------------------------------------------------------------
-- 标签使用频次 Top N（按 note_tags 关联次数）
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_tag_frequency(result_limit integer default 10)
returns table (
  tag_name text,
  usage_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.name as tag_name,
    count(nt.note_id)::bigint as usage_count
  from public.tags t
  inner join public.note_tags nt on nt.tag_id = t.id
  inner join public.notes n on n.id = nt.note_id and n.deleted_at is null
  where t.user_id = auth.uid()
  group by t.id, t.name
  order by usage_count desc, t.name asc
  limit greatest(result_limit, 1);
$$;

comment on function public.get_dashboard_tag_frequency(integer) is
  '仪表盘：标签使用频次排行（仅统计未删除笔记上的标签）';

-- ---------------------------------------------------------------------------
-- 仪表盘汇总指标
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_summary()
returns table (
  total_notes bigint,
  weekly_edits bigint,
  total_tags bigint,
  total_links bigint,
  notes_this_week bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (
      select count(*)::bigint
      from public.notes
      where user_id = auth.uid()
        and deleted_at is null
    ) as total_notes,
    (
      select count(*)::bigint
      from public.note_history nh
      inner join public.notes n on n.id = nh.note_id
      where n.user_id = auth.uid()
        and nh.created_at >= date_trunc('week', now())
    ) as weekly_edits,
    (
      select count(*)::bigint
      from public.tags
      where user_id = auth.uid()
    ) as total_tags,
    (
      select count(*)::bigint
      from public.note_links
      where user_id = auth.uid()
    ) as total_links,
    (
      select count(*)::bigint
      from public.notes
      where user_id = auth.uid()
        and deleted_at is null
        and created_at >= date_trunc('week', now())
    ) as notes_this_week;
$$;

comment on function public.get_dashboard_summary() is
  '仪表盘：总笔记数、本周编辑次数、总标签数等汇总指标';

grant execute on function public.get_dashboard_daily_notes(integer) to authenticated;
grant execute on function public.get_dashboard_tag_frequency(integer) to authenticated;
grant execute on function public.get_dashboard_summary() to authenticated;
