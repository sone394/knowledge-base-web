-- 笔记公开分享：is_shared 标记 + 匿名只读策略

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.notes.is_shared IS '是否允许通过 /share/:id 公开只读访问';

CREATE INDEX IF NOT EXISTS idx_notes_shared
  ON public.notes (id)
  WHERE is_shared = true AND deleted_at IS NULL;

-- 允许匿名用户读取已分享且未删除的笔记（仅 title、content 等展示字段）
CREATE POLICY "notes_select_shared_anon" ON public.notes
  FOR SELECT
  USING (
    is_shared = true
    AND deleted_at IS NULL
  );
