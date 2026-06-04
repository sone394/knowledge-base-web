-- =============================================================================
-- 个人知识管理系统 — Supabase (PostgreSQL) 表结构
-- 在 Supabase Dashboard → SQL Editor 中执行本脚本
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 扩展
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 通用：自动更新 updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 防止笔记树形成环（移动 parent 时校验）
-- -----------------------------------------------------------------------------
create or replace function public.check_note_parent_cycle()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception '笔记不能将自身设为父节点';
  end if;

  if exists (
    with recursive ancestors as (
      select id, parent_id
      from public.notes
      where id = new.parent_id
      union all
      select n.id, n.parent_id
      from public.notes n
      inner join ancestors a on n.id = a.parent_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception '不能将父节点设为自己的后代，否则会形成环';
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. 笔记（树形：parent_id 自引用）
-- -----------------------------------------------------------------------------
create table public.notes (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users (id) on delete cascade,
  parent_id     uuid        references public.notes (id) on delete cascade,
  title         text        not null default '',
  content       text        not null default '',  -- Markdown 正文
  sort_order    integer     not null default 0,   -- 同级子节点排序
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint notes_no_self_parent check (id is distinct from parent_id)
);

comment on table public.notes is '笔记；通过 parent_id 组成树形结构';
comment on column public.notes.content is 'Markdown 格式正文';
comment on column public.notes.sort_order is '同一父节点下的显示顺序，数值越小越靠前';

create index idx_notes_user_id on public.notes (user_id);
create index idx_notes_parent_id on public.notes (parent_id);
create index idx_notes_user_parent_sort on public.notes (user_id, parent_id, sort_order);
create index idx_notes_user_updated_at on public.notes (user_id, updated_at desc);
create index idx_notes_user_created_at on public.notes (user_id, created_at desc);

create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create trigger trg_notes_prevent_cycle
  before insert or update of parent_id on public.notes
  for each row execute function public.check_note_parent_cycle();

-- -----------------------------------------------------------------------------
-- 2. 标签
-- -----------------------------------------------------------------------------
create table public.tags (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  name        text        not null,
  created_at  timestamptz not null default now(),

  constraint tags_name_not_empty check (char_length(trim(name)) > 0),
  constraint tags_user_name_unique unique (user_id, name)
);

comment on table public.tags is '用户标签；同一用户下标签名唯一';

create index idx_tags_user_id on public.tags (user_id);
create index idx_tags_user_name on public.tags (user_id, name);

-- -----------------------------------------------------------------------------
-- 3. 笔记 ↔ 标签（多对多）
-- -----------------------------------------------------------------------------
create table public.note_tags (
  note_id     uuid        not null references public.notes (id) on delete cascade,
  tag_id      uuid        not null references public.tags (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (note_id, tag_id)
);

comment on table public.note_tags is '笔记与标签的多对多关联';

create index idx_note_tags_tag_id on public.note_tags (tag_id);
create index idx_note_tags_note_id on public.note_tags (note_id);

-- -----------------------------------------------------------------------------
-- 4. 笔记双向链接（有向边：source → target）
--    - 出站：where source_note_id = ?
--    - 反向：where target_note_id = ?  （backlinks）
-- -----------------------------------------------------------------------------
create table public.note_links (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  source_note_id  uuid        not null references public.notes (id) on delete cascade,
  target_note_id  uuid        not null references public.notes (id) on delete cascade,
  created_at      timestamptz not null default now(),

  constraint note_links_no_self_link check (source_note_id <> target_note_id),
  constraint note_links_source_target_unique unique (source_note_id, target_note_id)
);

comment on table public.note_links is '笔记间链接；source 指向 target，可双向查询';
comment on column public.note_links.source_note_id is '链接所在笔记（出站）';
comment on column public.note_links.target_note_id is '被链接的目标笔记（用于反向/backlinks 查询）';

create index idx_note_links_user_id on public.note_links (user_id);
create index idx_note_links_source on public.note_links (source_note_id);
create index idx_note_links_target on public.note_links (target_note_id);
create index idx_note_links_user_target on public.note_links (user_id, target_note_id);

-- -----------------------------------------------------------------------------
-- 约束：关联表中的笔记/标签必须属于同一用户（数据一致性）
-- -----------------------------------------------------------------------------
create or replace function public.enforce_note_tag_same_user()
returns trigger
language plpgsql
as $$
declare
  note_owner uuid;
  tag_owner  uuid;
begin
  select user_id into note_owner from public.notes where id = new.note_id;
  select user_id into tag_owner from public.tags where id = new.tag_id;

  if note_owner is null or tag_owner is null then
    raise exception '笔记或标签不存在';
  end if;

  if note_owner <> tag_owner then
    raise exception '笔记与标签必须属于同一用户';
  end if;

  return new;
end;
$$;

create trigger trg_note_tags_same_user
  before insert on public.note_tags
  for each row execute function public.enforce_note_tag_same_user();

create or replace function public.enforce_note_link_same_user()
returns trigger
language plpgsql
as $$
declare
  source_owner uuid;
  target_owner uuid;
begin
  select user_id into source_owner from public.notes where id = new.source_note_id;
  select user_id into target_owner from public.notes where id = new.target_note_id;

  if source_owner is null or target_owner is null then
    raise exception '源笔记或目标笔记不存在';
  end if;

  if source_owner <> target_owner or source_owner <> new.user_id then
    raise exception '链接两端笔记与 user_id 必须属于同一用户';
  end if;

  return new;
end;
$$;

create trigger trg_note_links_same_user
  before insert or update on public.note_links
  for each row execute function public.enforce_note_link_same_user();

-- -----------------------------------------------------------------------------
-- Row Level Security（按 user_id 隔离，适合个人知识库）
-- 启用后请确保已登录：auth.uid() = user_id
-- -----------------------------------------------------------------------------
alter table public.notes      enable row level security;
alter table public.tags       enable row level security;
alter table public.note_tags  enable row level security;
alter table public.note_links enable row level security;

-- notes
create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);

create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

-- tags
create policy "tags_select_own" on public.tags
  for select using (auth.uid() = user_id);

create policy "tags_insert_own" on public.tags
  for insert with check (auth.uid() = user_id);

create policy "tags_update_own" on public.tags
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tags_delete_own" on public.tags
  for delete using (auth.uid() = user_id);

-- note_tags（通过关联笔记/标签的归属校验）
create policy "note_tags_select_own" on public.note_tags
  for select using (
    exists (
      select 1 from public.notes n
      where n.id = note_tags.note_id and n.user_id = auth.uid()
    )
  );

create policy "note_tags_insert_own" on public.note_tags
  for insert with check (
    exists (
      select 1 from public.notes n
      where n.id = note_tags.note_id and n.user_id = auth.uid()
    )
    and exists (
      select 1 from public.tags t
      where t.id = note_tags.tag_id and t.user_id = auth.uid()
    )
  );

create policy "note_tags_delete_own" on public.note_tags
  for delete using (
    exists (
      select 1 from public.notes n
      where n.id = note_tags.note_id and n.user_id = auth.uid()
    )
  );

-- note_links
create policy "note_links_select_own" on public.note_links
  for select using (auth.uid() = user_id);

create policy "note_links_insert_own" on public.note_links
  for insert with check (auth.uid() = user_id);

create policy "note_links_update_own" on public.note_links
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "note_links_delete_own" on public.note_links
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 辅助视图：反向链接（backlinks）查询示例
-- -----------------------------------------------------------------------------
create or replace view public.note_backlinks as
select
  nl.target_note_id as note_id,
  nl.source_note_id as linked_from_note_id,
  nl.id             as link_id,
  nl.created_at     as link_created_at,
  n.user_id,
  n.title           as linked_from_title
from public.note_links nl
join public.notes n on n.id = nl.source_note_id;

comment on view public.note_backlinks is '某笔记被哪些笔记链接（反向链接）';

-- 视图继承底层表 RLS；对 notes / note_links 已启用策略即可
