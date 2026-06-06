-- 为笔记表添加 AI 摘要字段
ALTER TABLE notes ADD COLUMN IF NOT EXISTS summary TEXT;

COMMENT ON COLUMN public.notes.summary IS 'AI 生成的笔记摘要';
