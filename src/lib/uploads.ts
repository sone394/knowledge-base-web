import { supabase } from './supabaseClient'

const BUCKET = 'note-assets'

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()\u4e00-\u9fff]/g, '_').slice(0, 120)
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function uploadNoteAsset(
  file: File,
  userId: string,
): Promise<string> {
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    if (file.type.startsWith('image/')) {
      return readFileAsDataUrl(file)
    }
    throw new Error(`上传失败：${error.message}`)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}
