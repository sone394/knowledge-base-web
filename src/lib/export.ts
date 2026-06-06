import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { supabase } from './supabaseClient'
import { decryptNotes } from './noteCrypto'
import { buildNoteTree } from '../hooks/utils/noteTree'
import type { Note, NoteTreeNode } from '../../types/database'

export const AUTO_EXPORT_ENABLED_KEY = 'kb_auto_export_enabled'
export const AUTO_EXPORT_LAST_AT_KEY = 'kb_auto_export_last_at'

/** 两次自动导出之间的最短间隔（24 小时） */
export const AUTO_EXPORT_INTERVAL_MS = 24 * 60 * 60 * 1000

/** 定时检查间隔（1 小时） */
export const AUTO_EXPORT_CHECK_MS = 60 * 60 * 1000

function sanitizeFileName(name: string): string {
  const trimmed = (name.trim() || '未命名笔记')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\.+$/, '')
    .trim()

  return trimmed.slice(0, 100) || '未命名笔记'
}

function resolveUniqueName(
  folderKey: string,
  baseName: string,
  usedNames: Map<string, Set<string>>,
): string {
  const usedInFolder = usedNames.get(folderKey) ?? new Set<string>()
  usedNames.set(folderKey, usedInFolder)

  let fileName = `${baseName}.md`
  let counter = 2

  while (usedInFolder.has(fileName)) {
    fileName = `${baseName} (${counter}).md`
    counter += 1
  }

  usedInFolder.add(fileName)
  return fileName
}

function buildMarkdown(note: Note): string {
  const title = note.title.trim() || '未命名笔记'
  const lines = [`# ${title}`, '']

  if (note.summary?.trim()) {
    lines.push(`> ${note.summary.trim()}`, '')
  }

  if (note.content.trim()) {
    lines.push(note.content.trim())
  }

  lines.push(
    '',
    '---',
    `updated_at: ${note.updated_at}`,
    `exported_at: ${new Date().toISOString()}`,
  )

  return lines.join('\n')
}

function addNoteFile(
  zip: JSZip,
  note: Note,
  parentPath: string,
  usedNames: Map<string, Set<string>>,
): void {
  const folderKey = parentPath || '/'
  const baseName = sanitizeFileName(note.title)
  const fileName = resolveUniqueName(folderKey, baseName, usedNames)
  const filePath = parentPath ? `${parentPath}/${fileName}` : fileName

  zip.file(filePath, buildMarkdown(note))
}

function addNotesToZip(
  zip: JSZip,
  nodes: NoteTreeNode[],
  parentPath: string,
  usedNames: Map<string, Set<string>>,
): void {
  for (const node of nodes) {
    const hasChildren = (node.children?.length ?? 0) > 0
    const folderName = sanitizeFileName(node.title)

    if (hasChildren) {
      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName
      addNoteFile(zip, node, folderPath, usedNames)
      addNotesToZip(zip, node.children!, folderPath, usedNames)
    } else {
      addNoteFile(zip, node, parentPath, usedNames)
    }
  }
}

export function isAutoExportEnabled(): boolean {
  return localStorage.getItem(AUTO_EXPORT_ENABLED_KEY) === 'true'
}

export function setAutoExportEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_EXPORT_ENABLED_KEY, String(enabled))
}

export function getLastExportAt(): number | null {
  const raw = localStorage.getItem(AUTO_EXPORT_LAST_AT_KEY)
  if (!raw) return null

  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

export function setLastExportAt(timestamp = Date.now()): void {
  localStorage.setItem(AUTO_EXPORT_LAST_AT_KEY, String(timestamp))
}

export function shouldRunAutoExport(now = Date.now()): boolean {
  if (!isAutoExportEnabled()) return false

  const lastExportAt = getLastExportAt()
  if (lastExportAt === null) return true

  return now - lastExportAt >= AUTO_EXPORT_INTERVAL_MS
}

export async function exportAllNotes(vaultPassword: string): Promise<number> {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!notes?.length) {
    throw new Error('没有可导出的笔记')
  }

  const decrypted = decryptNotes(notes, vaultPassword)
  const tree = buildNoteTree(decrypted)
  const zip = new JSZip()
  const usedNames = new Map<string, Set<string>>()

  addNotesToZip(zip, tree, '', usedNames)

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  const date = new Date().toISOString().slice(0, 10)
  saveAs(blob, `knowledge-base-${date}.zip`)

  return decrypted.length
}

let autoExportInFlight = false

/** 若满足自动导出条件则执行导出，返回是否已触发 */
export async function runAutoExportIfDue(vaultPassword: string): Promise<boolean> {
  if (!shouldRunAutoExport() || autoExportInFlight) return false

  autoExportInFlight = true

  try {
    await exportAllNotes(vaultPassword)
    setLastExportAt()
    return true
  } catch (err) {
    console.warn('[autoExport] 自动导出失败:', err)
    return false
  } finally {
    autoExportInFlight = false
  }
}
