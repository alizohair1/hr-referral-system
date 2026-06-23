import { supabase } from './supabase'

export const MAX_CV_MB   = 10
export const ACCEPTED_CV = '.pdf,.doc,.docx,.jpg,.jpeg,.png'

const ALLOWED_EXTS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']

export function validateCv(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (!ALLOWED_EXTS.includes(ext))
    return 'Only PDF, DOC, DOCX, JPG or PNG files are accepted.'
  if (file.size > MAX_CV_MB * 1024 * 1024)
    return `File must be under ${MAX_CV_MB} MB.`
  return null
}

// compress DOC/DOCX with gzip; PDFs and images uploaded as-is
async function maybeCompress(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['doc', 'docx'].includes(ext)) return { blob: file, compressed: false }
  try {
    const cs     = new CompressionStream('gzip')
    const writer = cs.writable.getWriter()
    writer.write(await file.arrayBuffer())
    writer.close()
    const chunks = []
    const reader = cs.readable.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    return { blob: new Blob(chunks, { type: 'application/octet-stream' }), compressed: true }
  } catch {
    return { blob: file, compressed: false }
  }
}

export async function uploadCv(file, userId) {
  const ext          = file.name.split('.').pop().toLowerCase()
  const { blob }     = await maybeCompress(file)
  const path         = `${userId}/${Date.now()}_cv.${ext}`
  const { error }    = await supabase.storage.from('cvs').upload(path, blob)
  if (error) throw error
  return { path, originalName: file.name, mime: file.type, kind: 'cv' }
}

export async function uploadPhoto(file, userId) {
  const ext       = file.name.split('.').pop().toLowerCase()
  const path      = `${userId}/${Date.now()}_photo.${ext}`
  const { error } = await supabase.storage.from('cvs').upload(path, file)
  if (error) throw error
  return { path, originalName: file.name, mime: file.type, kind: 'photo' }
}

export async function getCvObjectUrl(path, mime) {
  if (!path) return null
  try {
    const { data, error } = await supabase.storage.from('cvs').download(path)
    if (error || !data) return null
    const ext = path.split('.').pop().toLowerCase()
    if (['doc', 'docx'].includes(ext)) {
      const ds     = new DecompressionStream('gzip')
      const writer = ds.writable.getWriter()
      writer.write(await data.arrayBuffer())
      writer.close()
      const chunks = []
      const reader = ds.readable.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      return URL.createObjectURL(new Blob(chunks, { type: mime || 'application/octet-stream' }))
    }
    return URL.createObjectURL(data)
  } catch {
    return null
  }
}

export async function getPhotoObjectUrl(path) {
  if (!path) return null
  try {
    const { data, error } = await supabase.storage.from('cvs').download(path)
    if (error || !data) return null
    return URL.createObjectURL(data)
  } catch {
    return null
  }
}
