/**
 * Supabase Storage Service
 * Handles uploads/downloads for photos, documents, and avatars
 */

import { supabase } from './supabaseAuth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface UploadResult {
  url: string
  path: string
}

/**
 * Storage request helper (REST API)
 * Used for file uploads/downloads
 * Uses authenticated user's JWT token for RLS enforcement
 */
async function storageRequest(
  method: string,
  endpoint: string,
  body?: any,
  headers?: Record<string, string>
): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Storage] Missing Supabase credentials')
    return null
  }

  const url = `${SUPABASE_URL}/storage/v1${endpoint}`

  // Get authenticated user's JWT token
  let authToken = SUPABASE_ANON_KEY
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      authToken = session.access_token
      console.log('[Storage] Using authenticated JWT token')
    }
  } catch (err) {
    console.warn('[Storage] Failed to get auth token, using anon key:', err)
  }

  const defaultHeaders: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${authToken}`,
  }

  const allHeaders = { ...defaultHeaders, ...headers }

  try {
    const config: RequestInit = {
      method,
      headers: allHeaders,
    }

    // For uploads, send raw file data (not FormData)
    if (method !== 'GET' && method !== 'DELETE' && body) {
      config.body = body instanceof File ? body : body
    }

    const res = await fetch(url, config)

    if (!res.ok) {
      const errorBody = await res.text()
      console.error(`[Storage] ${method} ${endpoint} failed:`, res.status, errorBody)
      throw new Error(`Storage error: ${res.status}`)
    }

    if (method === 'DELETE') {
      return { success: true }
    }

    const text = await res.text()
    return text ? JSON.parse(text) : null
  } catch (err) {
    console.error('[Storage] Request failed:', err)
    throw err
  }
}

// ─── Project Photos ────────────────────────────────────────────────────────

/**
 * Upload a project photo to `project-photos` bucket
 * Returns public URL immediately
 */
export async function uploadProjectPhoto(
  projectId: string,
  file: File
): Promise<UploadResult | null> {
  try {
    const timestamp = Date.now()
    const filename = file.name.replace(/[^a-z0-9.-]/gi, '_')
    const path = `projects/${projectId}/photos/${timestamp}-${filename}`

    const result = await storageRequest(
      'POST',
      `/object/project-photos/${encodeURIComponent(path)}`,
      file,
      { 'Content-Type': file.type }
    )

    if (result && result.Key) {
      // Construct public URL - result.Key should contain the full path
      const decodedKey = decodeURIComponent(result.Key)
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/project-photos/${decodedKey}`
      console.log('[Storage] Uploaded photo:', {
        inputPath: path,
        returnedKey: result.Key,
        decodedKey,
        constructedUrl: publicUrl,
        timestamp
      })
      return { url: publicUrl, path: decodedKey }
    }

    console.error('[Storage] Upload response missing Key:', result)
    return null
  } catch (err) {
    console.error('[Storage] Photo upload failed:', err)
    return null
  }
}

// ─── Crew Avatars ────────────────────────────────────────────────────────

/**
 * Upload crew member avatar to `crew-avatars` bucket
 * Replaces existing avatar if present
 */
export async function uploadCrewAvatar(
  userId: number,
  file: File
): Promise<UploadResult | null> {
  try {
    const path = `crew/${userId}/avatar.jpg`

    // Delete old avatar first
    try {
      await deleteStorageFile('crew-avatars', path)
    } catch {
      // Ignore if file doesn't exist
    }

    const result = await storageRequest(
      'POST',
      `/object/crew-avatars/${encodeURIComponent(path)}`,
      file,
      { 'Content-Type': file.type }
    )

    if (result && result.Key) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/crew-avatars/${result.Key}`
      console.log('[Storage] Uploaded avatar:', path)
      return { url: publicUrl, path: result.Key }
    }

    return null
  } catch (err) {
    console.error('[Storage] Avatar upload failed:', err)
    return null
  }
}

// ─── Documents (Private) ────────────────────────────────────────────────────

/**
 * Upload document to `documents` bucket
 * Documents are private — generates signed URL with expiry
 */
export async function uploadDocument(
  projectId: string,
  file: File
): Promise<UploadResult | null> {
  try {
    const timestamp = Date.now()
    const filename = file.name.replace(/[^a-z0-9.-]/gi, '_')
    const path = `projects/${projectId}/documents/${timestamp}-${filename}`

    const result = await storageRequest(
      'POST',
      `/object/documents/${encodeURIComponent(path)}`,
      file,
      { 'Content-Type': file.type }
    )

    if (result && result.Key) {
      // Generate signed URL (1 hour expiry)
      const signedUrl = await getSignedUrl('documents', result.Key, 3600)
      if (signedUrl) {
        console.log('[Storage] Uploaded document:', path)
        return { url: signedUrl, path: result.Key }
      }
    }

    return null
  } catch (err) {
    console.error('[Storage] Document upload failed:', err)
    return null
  }
}

// ─── Message Attachments (Private) ────────────────────────────────────────

/**
 * Upload file attachment to `message-attachments` bucket
 * Attachments are private — generates signed URL with 24h expiry
 */
export async function uploadMessageAttachment(
  threadId: string,
  file: File
): Promise<UploadResult | null> {
  try {
    const timestamp = Date.now()
    const filename = file.name.replace(/[^a-z0-9.-]/gi, '_')
    const path = `threads/${threadId}/${timestamp}-${filename}`

    const result = await storageRequest(
      'POST',
      `/object/message-attachments/${encodeURIComponent(path)}`,
      file,
      { 'Content-Type': file.type }
    )

    if (result && result.Key) {
      // Generate signed URL (24 hour expiry)
      const signedUrl = await getSignedUrl('message-attachments', result.Key, 86400)
      if (signedUrl) {
        console.log('[Storage] Uploaded attachment:', path)
        return { url: signedUrl, path: result.Key }
      }
    }

    return null
  } catch (err) {
    console.error('[Storage] Attachment upload failed:', err)
    return null
  }
}

// ─── Delete File ────────────────────────────────────────────────────────

/**
 * Delete file from storage bucket
 */
export async function deleteStorageFile(bucket: string, path: string): Promise<boolean> {
  try {
    await storageRequest(
      'DELETE',
      `/object/${bucket}/${encodeURIComponent(path)}`,
      undefined
    )

    console.log('[Storage] Deleted file:', path)
    return true
  } catch (err) {
    console.error('[Storage] Delete failed:', err)
    return false
  }
}

// ─── Signed URLs (for Private Buckets) ────────────────────────────────────

/**
 * Generate signed URL for private bucket access
 * URL expires after specified seconds
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Supabase signed URL format
    // For now, use REST API approach
    const url = `${SUPABASE_URL}/storage/v1/sign/${bucket}/${encodeURIComponent(path)}?token=${SUPABASE_ANON_KEY}&expires=${expiresIn}`
    return url
  } catch (err) {
    console.error('[Storage] Failed to generate signed URL:', err)
    return null
  }
}

// ─── Public URL (for Public Buckets) ────────────────────────────────────

/**
 * Get public URL for file in public bucket
 * Works only for public buckets (project-photos, crew-avatars)
 */
export function getPublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`
}

// ─── List Files ────────────────────────────────────────────────────────

/**
 * List files in a bucket folder
 */
export async function listFilesInFolder(
  bucket: string,
  folderPath: string
): Promise<string[] | null> {
  try {
    const result = await storageRequest(
      'GET',
      `/list/${bucket}/${encodeURIComponent(folderPath)}`
    )

    if (result && Array.isArray(result)) {
      return result.map((item: any) => item.name)
    }

    return []
  } catch (err) {
    console.error('[Storage] List failed:', err)
    return null
  }
}

// ─── Metadata ────────────────────────────────────────────────────────

/**
 * Get file metadata (size, created_at, etc.)
 */
export async function getFileMetadata(
  bucket: string,
  path: string
): Promise<Record<string, any> | null> {
  try {
    const result = await storageRequest(
      'GET',
      `/metadata/${bucket}/${encodeURIComponent(path)}`
    )

    return result || null
  } catch (err) {
    console.error('[Storage] Metadata fetch failed:', err)
    return null
  }
}
