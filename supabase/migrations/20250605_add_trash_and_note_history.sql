-- 软删除与编辑历史
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS note_history (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id     uuid        REFERENCES notes(id) ON DELETE CASCADE,
  content     text,
  title       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_note_history_note_id_created_at
  ON note_history (note_id, created_at DESC);

COMMENT ON COLUMN public.notes.deleted_at IS '软删除时间，非空表示在回收站';
COMMENT ON TABLE public.note_history IS '笔记编辑历史版本';

ALTER TABLE public.note_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_history_select_own" ON public.note_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_history.note_id AND n.user_id = auth.uid()
    )
  );

CREATE POLICY "note_history_insert_own" ON public.note_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_history.note_id AND n.user_id = auth.uid()
    )
  );

CREATE POLICY "note_history_delete_own" ON public.note_history
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_history.note_id AND n.user_id = auth.uid()
    )
  );
