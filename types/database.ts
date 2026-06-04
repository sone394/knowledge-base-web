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
  sort_order: number
  created_at: string
  updated_at: string
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
  sort_order?: number
  created_at?: string
  updated_at?: string
}

export interface NoteUpdate {
  parent_id?: string | null
  title?: string
  content?: string
  sort_order?: number
  updated_at?: string
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
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          parent_id?: string | null
          title?: string
          content?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          parent_id?: string | null
          title?: string
          content?: string
          sort_order?: number
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
    Functions: Record<string, never>
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
} as const

export type TableName = (typeof TABLE)[keyof typeof TABLE]

export type Tables<T extends TableName> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends TableName> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends TableName> =
  Database['public']['Tables'][T]['Update']
