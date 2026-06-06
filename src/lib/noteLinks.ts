import { supabase } from './supabaseClient'

const WIKI_LINK_REGEX = /\[\[[^|\]]+?\|([^\]]+?)\]\]/g

/** 从 Markdown 正文中解析维基链接目标笔记 id */
export function extractWikiLinkTargetIds(
  content: string,
  sourceNoteId: string,
): string[] {
  const ids = new Set<string>()

  for (const match of content.matchAll(WIKI_LINK_REGEX)) {
    const id = match[1]?.trim()
    if (id && id !== sourceNoteId) {
      ids.add(id)
    }
  }

  return [...ids]
}

/** 将笔记正文中的 [[标题|id]] 同步到 note_links 表 */
export async function syncNoteLinks(
  sourceNoteId: string,
  userId: string,
  content: string,
): Promise<string[]> {
  const targetIds = extractWikiLinkTargetIds(content, sourceNoteId)

  const { data: existing, error: fetchError } = await supabase
    .from('note_links')
    .select('id, target_note_id')
    .eq('source_note_id', sourceNoteId)

  if (fetchError) throw fetchError

  const existingRows = existing ?? []
  const existingTargets = new Set(existingRows.map((row) => row.target_note_id))
  const newTargets = new Set(targetIds)

  const toDelete = existingRows
    .filter((row) => !newTargets.has(row.target_note_id))
    .map((row) => row.id)

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('note_links')
      .delete()
      .in('id', toDelete)

    if (deleteError) throw deleteError
  }

  const toInsert = targetIds
    .filter((id) => !existingTargets.has(id))
    .map((target_note_id) => ({
      user_id: userId,
      source_note_id: sourceNoteId,
      target_note_id,
    }))

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('note_links')
      .insert(toInsert)

    if (insertError) throw insertError
  }

  return targetIds
}
