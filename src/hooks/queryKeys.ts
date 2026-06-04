export const queryKeys = {
  notes: {
    all: ['notes'] as const,
    tree: () => [...queryKeys.notes.all, 'tree'] as const,
    detail: (id: string) => [...queryKeys.notes.all, 'detail', id] as const,
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
} as const
