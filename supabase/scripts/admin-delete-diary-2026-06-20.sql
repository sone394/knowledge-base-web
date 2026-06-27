-- =============================================================================
-- 一次性修复：在 Supabase Dashboard → SQL Editor 中粘贴并运行
-- 项目：https://supabase.com/dashboard/project/cieeswdgkznfiomxlmgd/sql
-- =============================================================================

-- 1. 查看这篇日记的归属（确认后再执行删除）
SELECT
  n.id,
  n.title,
  n.user_id,
  n.deleted_at,
  u.email AS owner_email
FROM public.notes AS n
LEFT JOIN auth.users AS u ON u.id = n.user_id
WHERE n.title = '2026-06-20';

-- 2. 永久删除（含历史版本；以 postgres 权限执行，不受 RLS 限制）
DELETE FROM public.note_history
WHERE note_id IN (
  SELECT id FROM public.notes WHERE title = '2026-06-20'
);

DELETE FROM public.notes
WHERE title = '2026-06-20';

-- 3. 可选：若希望保留笔记、只改归属到您当前邮箱，把下面邮箱改成您的登录邮箱后执行
-- UPDATE public.notes AS n
-- SET user_id = u.id
-- FROM auth.users AS u
-- WHERE n.title = '2026-06-20'
--   AND u.email = '2067527110@qq.com';

-- 4. 安装 adopt_orphan_note 函数（防止以后再出现同类问题）
CREATE OR REPLACE FUNCTION public.adopt_orphan_note(p_note_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  note_owner uuid;
BEGIN
  SELECT user_id INTO note_owner
  FROM public.notes
  WHERE id = p_note_id;

  IF note_owner IS NULL THEN
    RETURN false;
  END IF;

  IF note_owner = auth.uid() THEN
    RETURN true;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = note_owner) THEN
    RETURN false;
  END IF;

  UPDATE public.notes
  SET user_id = auth.uid()
  WHERE id = p_note_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.adopt_orphan_note(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adopt_orphan_note(uuid) TO authenticated;
