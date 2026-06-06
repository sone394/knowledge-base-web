import { supabase } from './supabaseClient'
import type { TagInsert } from '../../types/database'

async function findOrCreateTag(userId: string, name: string): Promise<string> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('标签名不能为空')
  }

  const { data: existingTags, error: fetchError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('user_id', userId)

  if (fetchError) throw fetchError

  const existing = (existingTags ?? []).find(
    (tag) => tag.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (existing) return existing.id

  const payload: TagInsert = {
    user_id: userId,
    name: trimmed,
  }

  const { data, error } = await supabase
    .from('tags')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

async function linkTagToNote(noteId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('note_tags')
    .insert({ note_id: noteId, tag_id: tagId })

  if (error && error.code !== '23505') throw error
}

/** 将标签名追加到笔记，不删除已有标签；已关联的标签会跳过 */
export async function appendTagNamesToNote(
  noteId: string,
  userId: string,
  tagNames: string[],
): Promise<void> {
  for (const name of tagNames) {
    const trimmed = name.trim()
    if (!trimmed) continue

    try {
      const tagId = await findOrCreateTag(userId, trimmed)
      await linkTagToNote(noteId, tagId)
    } catch (err) {
      console.warn('[appendTagNamesToNote] 添加标签失败:', name, err)
    }
  }
}
