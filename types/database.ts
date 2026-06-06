/**
 * Supabase 数据库类型定义
 * 与 supabase/schema.sql 中的 public 表结构对应
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// 行类型（SELECT 结果）
// ---------------------------------------------------------------------------

export interface Note {
  id: string
  user_id: string
  parent_id: string | null
  title: string
  content: string
  summary: string | null
  sort_order: number
  deleted_at: string | null
  needs_review: boolean
  review_interval: number
  next_review_date: string | null
  review_count: number
  created_at: string
  updated_at: string
}

export interface ReviewLog {
  id: string
  note_id: string
  user_id: string
  reviewed_at: string
  rating: number
}

export interface NoteHistory {
  id: string
  note_id: string
  content: string | null
  title: string | null
  created_at: string
}

export interface Tag {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface NoteTag {
  note_id: string
  tag_id: string
  created_at: string
}

export interface NoteLink {
  id: string
  user_id: string
  source_note_id: string
  target_note_id: string
  created_at: string
}

/** 反向链接视图 note_backlinks */
export interface NoteBacklink {
  note_id: string
  linked_from_note_id: string
  link_id: string
  link_created_at: string
  user_id: string
  linked_from_title: string
}

// ---------------------------------------------------------------------------
// 插入 / 更新（API 写入时可选字段）
// ---------------------------------------------------------------------------

export interface NoteInsert {
  id?: string
  user_id: string
  parent_id?: string | null
  title?: string
  content?: string
  summary?: string | null
  sort_order?: number
  deleted_at?: string | null
  needs_review?: boolean
  review_interval?: number
  next_review_date?: string | null
  review_count?: number
  created_at?: string
  updated_at?: string
}

export interface NoteUpdate {
  parent_id?: string | null
  title?: string
  content?: string
  summary?: string | null
  sort_order?: number
  deleted_at?: string | null
  needs_review?: boolean
  review_interval?: number
  next_review_date?: string | null
  review_count?: number
  updated_at?: string
}

export interface ReviewLogInsert {
  id?: string
  note_id: string
  user_id: string
  reviewed_at?: string
  rating: number
}

export interface NoteHistoryInsert {
  id?: string
  note_id: string
  content?: string | null
  title?: string | null
  created_at?: string
}

export interface TagInsert {
  id?: string
  user_id: string
  name: string
  created_at?: string
}

export interface TagUpdate {
  name?: string
}

export interface NoteTagInsert {
  note_id: string
  tag_id: string
  created_at?: string
}

export interface NoteTagUpdate {
  note_id?: string
  tag_id?: string
  created_at?: string
}

export interface NoteLinkInsert {
  id?: string
  user_id: string
  source_note_id: string
  target_note_id: string
  created_at?: string
}

export interface NoteLinkUpdate {
  source_note_id?: string
  target_note_id?: string
}

// ---------------------------------------------------------------------------
// 关联查询时的扩展类型
// ---------------------------------------------------------------------------

export interface NoteWithTags extends Note {
  tags?: Tag[]
}

export interface NoteWithLinks extends Note {
  /** 本笔记指向的其他笔记（出站链接） */
  outlinks?: NoteLink[]
  /** 指向本笔记的链接（反向，也可用 NoteBacklink） */
  backlinks?: NoteBacklink[]
}

/** search_notes RPC 返回行 */
export interface NoteSearchResult extends Note {
  rank: number
}

/** get_dashboard_daily_notes RPC 返回行 */
export interface DashboardDailyNoteRow {
  day: string
  count: number
}

/** get_dashboard_tag_frequency RPC 返回行 */
export interface DashboardTagFrequencyRow {
  tag_name: string
  usage_count: number
}

/** get_dashboard_summary RPC 返回行 */
export interface DashboardSummaryRow {
  total_notes: number
  weekly_edits: number
  total_tags: number
  total_links: number
  notes_this_week: number
}

export interface NoteTreeNode extends Note {
  children?: NoteTreeNode[]
}

// ---------------------------------------------------------------------------
// Supabase Database 泛型（传给 createClient<Database>）
// 使用内联对象类型以满足 @supabase/supabase-js GenericSchema 约束
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string
          user_id: string
          parent_id: string | null
          title: string
          content: string
          summary: string | null
          sort_order: number
          deleted_at: string | null
          needs_review: boolean
          review_interval: number
          next_review_date: string | null
          review_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          parent_id?: string | null
          title?: string
          content?: string
          summary?: string | null
          sort_order?: number
          deleted_at?: string | null
          needs_review?: boolean
          review_interval?: number
          next_review_date?: string | null
          review_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          parent_id?: string | null
          title?: string
          content?: string
          summary?: string | null
          sort_order?: number
          deleted_at?: string | null
          needs_review?: boolean
          review_interval?: number
          next_review_date?: string | null
          review_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notes_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tags_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      note_tags: {
        Row: {
          note_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          note_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          note_id?: string
          tag_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'note_tags_note_id_fkey'
            columns: ['note_id']
            isOneToOne: false
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'note_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'tags'
            referencedColumns: ['id']
          },
        ]
      }
      note_history: {
        Row: {
          id: string
          note_id: string
          content: string | null
          title: string | null
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          content?: string | null
          title?: string | null
          created_at?: string
        }
        Update: {
          note_id?: string
          content?: string | null
          title?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'note_history_note_id_fkey'
            columns: ['note_id']
            isOneToOne: false
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
        ]
      }
      review_logs: {
        Row: {
          id: string
          note_id: string
          user_id: string
          reviewed_at: string
          rating: number
        }
        Insert: {
          id?: string
          note_id: string
          user_id: string
          reviewed_at?: string
          rating: number
        }
        Update: {
          note_id?: string
          user_id?: string
          reviewed_at?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: 'review_logs_note_id_fkey'
            columns: ['note_id']
            isOneToOne: false
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'review_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      note_links: {
        Row: {
          id: string
          user_id: string
          source_note_id: string
          target_note_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_note_id: string
          target_note_id: string
          created_at?: string
        }
        Update: {
          source_note_id?: string
          target_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'note_links_source_note_id_fkey'
            columns: ['source_note_id']
            isOneToOne: false
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'note_links_target_note_id_fkey'
            columns: ['target_note_id']
            isOneToOne: false
            referencedRelation: 'notes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'note_links_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      note_backlinks: {
        Row: {
          note_id: string
          linked_from_note_id: string
          link_id: string
          link_created_at: string
          user_id: string
          linked_from_title: string
        }
        Relationships: []
      }
    }
    Functions: {
      search_notes: {
        Args: {
          query_text: string
        }
        Returns: NoteSearchResult[]
      }
      get_dashboard_daily_notes: {
        Args: {
          days?: number
        }
        Returns: DashboardDailyNoteRow[]
      }
      get_dashboard_tag_frequency: {
        Args: {
          result_limit?: number
        }
        Returns: DashboardTagFrequencyRow[]
      }
      get_dashboard_summary: {
        Args: Record<string, never>
        Returns: DashboardSummaryRow[]
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 表名常量与便捷类型别名
// ---------------------------------------------------------------------------

export const TABLE = {
  notes: 'notes',
  tags: 'tags',
  note_tags: 'note_tags',
  note_links: 'note_links',
  note_history: 'note_history',
  review_logs: 'review_logs',
} as const

export type TableName = (typeof TABLE)[keyof typeof TABLE]

export type Tables<T extends TableName> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends TableName> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends TableName> =
  Database['public']['Tables'][T]['Update']
