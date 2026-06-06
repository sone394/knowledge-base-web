export const queryKeys = {
  notes: {
    all: ['notes'] as const,
    tree: () => [...queryKeys.notes.all, 'tree'] as const,
    detail: (id: string) => [...queryKeys.notes.all, 'detail', id] as const,
    search: (query: string) => [...queryKeys.notes.all, 'search', query] as const,
    byTag: (tagId: string) => [...queryKeys.notes.all, 'byTag', tagId] as const,
  },
  tags: {
    all: ['tags'] as const,
  },
  noteTags: {
    byNote: (noteId: string) => ['noteTags', noteId] as const,
  },
  backlinks: {
    byNote: (noteId: string) => ['backlinks', noteId] as const,
  },
  graph: {
    all: ['graph'] as const,
  },
  trash: {
    all: ['trash'] as const,
  },
  noteHistory: {
    byNote: (noteId: string) => ['noteHistory', noteId] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  review: {
    all: ['review'] as const,
    due: ['review', 'due'] as const,
  },
} as const
