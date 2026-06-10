-- =============================================================================
-- 笔记附件存储桶（图片、文件）
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('note-assets', 'note-assets', true)
on conflict (id) do nothing;

-- 认证用户可上传到自己的目录（路径前缀为 user_id）
create policy "Users can upload own note assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'note-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own note assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'note-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own note assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'note-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 公开读取（分享笔记中的图片链接可访问）
create policy "Public read note assets"
on storage.objects for select
to public
using (bucket_id = 'note-assets');
