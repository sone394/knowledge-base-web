-- =============================================================================
-- 在 Supabase Dashboard → SQL Editor 中执行本脚本
-- 笔记查询性能优化 + 全文搜索 RPC
-- 说明：content 若经客户端加密存储，仅 title 可被有效索引；content 列 FTS 对密文无效。
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON public.notes (parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes (created_at DESC);

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS tsv tsvector;

UPDATE public.notes
SET tsv = to_tsvector(
  'english',
  coalesce(title, '') || ' ' || coalesce(content, '')
)
WHERE tsv IS NULL;

CREATE OR REPLACE FUNCTION public.notes_tsv_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tsv := to_tsvector(
    'english',
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_notes_tsv ON public.notes;
CREATE TRIGGER trig_notes_tsv
  BEFORE INSERT OR UPDATE OF title, content ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.notes_tsv_trigger();

CREATE INDEX IF NOT EXISTS idx_notes_tsv ON public.notes USING GIN (tsv);

CREATE OR REPLACE FUNCTION public.search_notes(query_text text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  parent_id uuid,
  title text,
  content text,
  summary text,
  sort_order integer,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    n.id,
    n.user_id,
    n.parent_id,
    n.title,
    n.content,
    n.summary,
    n.sort_order,
    n.deleted_at,
    n.created_at,
    n.updated_at,
    ts_rank(n.tsv, plainto_tsquery('english', query_text)) AS rank
  FROM public.notes n
  WHERE n.user_id = auth.uid()
    AND n.deleted_at IS NULL
    AND query_text IS NOT NULL
    AND btrim(query_text) <> ''
    AND n.tsv @@ plainto_tsquery('english', query_text)
  ORDER BY rank DESC, n.updated_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_notes(text) TO authenticated;
