-- 将「原账号已不存在于 auth.users」的笔记归属到当前登录用户
-- 用于同一邮箱重新注册后，旧笔记 user_id 与现账号不一致的情况

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

COMMENT ON FUNCTION public.adopt_orphan_note IS
  '若笔记原 user_id 在 auth.users 中已不存在，则将其归属到当前用户（用于重新注册后的数据修复）';
