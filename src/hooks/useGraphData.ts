import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { queryKeys } from './queryKeys'

export type GraphNote = {
  id: string
  title: string
  backlinkCount: number
}

export type GraphLink = {
  source: string
  target: string
}

export type GraphData = {
  nodes: GraphNote[]
  links: GraphLink[]
}

async function fetchGraphData(): Promise<GraphData> {
  const [notesResult, linksResult] = await Promise.all([
    supabase.from('notes').select('id, title').is('deleted_at', null),
    supabase.from('note_links').select('source_note_id, target_note_id'),
  ])

  if (notesResult.error) throw notesResult.error
  if (linksResult.error) throw linksResult.error

  const notes = notesResult.data ?? []
  const rawLinks = linksResult.data ?? []

  const backlinkCounts = new Map<string, number>()
  for (const link of rawLinks) {
    const count = backlinkCounts.get(link.target_note_id) ?? 0
    backlinkCounts.set(link.target_note_id, count + 1)
  }

  const noteIds = new Set(notes.map((note) => note.id))

  const nodes: GraphNote[] = notes.map((note) => ({
    id: note.id,
    title: note.title.trim() || '未命名笔记',
    backlinkCount: backlinkCounts.get(note.id) ?? 0,
  }))

  const links: GraphLink[] = rawLinks
    .filter(
      (link) =>
        noteIds.has(link.source_note_id) && noteIds.has(link.target_note_id),
    )
    .map((link) => ({
      source: link.source_note_id,
      target: link.target_note_id,
    }))

  return { nodes, links }
}

export function useGraphData() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.graph.all,
    queryFn: fetchGraphData,
    enabled: !!user,
  })

  return {
    nodes: query.data?.nodes ?? [],
    links: query.data?.links ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
