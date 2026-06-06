import { supabase } from './supabaseClient'
import type { Note } from '../../types/database'

export type NoteSearchRow = Note & { rank: number }

export async function searchNotesRpc(query: string): Promise<NoteSearchRow[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const { data, error } = await supabase.rpc('search_notes', {
    query_text: trimmed,
  })

  if (error) throw error
  return (data ?? []) as NoteSearchRow[]
}

export function getSearchSnippet(note: Note, query: string): string {
  const q = query.trim().toLowerCase()
  const title = note.title.trim() || '未命名笔记'

  if (!q) return title
  if (title.toLowerCase().includes(q)) return title

  const content = note.content
  const index = content.toLowerCase().indexOf(q)
  if (index === -1) return title

  const start = Math.max(0, index - 30)
  const end = Math.min(content.length, index + query.length + 50)
  const excerpt = content.slice(start, end).replace(/\n/g, ' ')
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${excerpt}${suffix}`
}
