-- 间隔重复复习：notes 表新增复习字段 + review_logs 复习记录表

-- 1. notes 表新增复习相关字段
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_interval INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.notes.needs_review IS '是否纳入复习计划';
COMMENT ON COLUMN public.notes.review_interval IS '当前复习间隔（天）';
COMMENT ON COLUMN public.notes.next_review_date IS '下次复习日期';
COMMENT ON COLUMN public.notes.review_count IS '累计复习次数';

CREATE INDEX IF NOT EXISTS idx_notes_review_due
  ON public.notes (user_id, next_review_date)
  WHERE needs_review = true AND deleted_at IS NULL;

-- 2. 复习记录表
CREATE TABLE IF NOT EXISTS public.review_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id      UUID        NOT NULL REFERENCES public.notes (id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reviewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  rating       SMALLINT    NOT NULL CHECK (rating >= 0 AND rating <= 2)
);

COMMENT ON TABLE public.review_logs IS '笔记复习记录';
COMMENT ON COLUMN public.review_logs.rating IS '自评：0=困难，1=一般，2=简单';

CREATE INDEX IF NOT EXISTS idx_review_logs_note_id ON public.review_logs (note_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_id ON public.review_logs (user_id, reviewed_at DESC);

-- 3. RLS
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY review_logs_select_own ON public.review_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY review_logs_insert_own ON public.review_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY review_logs_delete_own ON public.review_logs
  FOR DELETE USING (auth.uid() = user_id);
