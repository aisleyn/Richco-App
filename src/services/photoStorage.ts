import type { Photo } from '../types'

const PHOTOS_STORAGE_KEY = 'richco-photos'

export function getStoredPhotos(): Photo[] {
  try {
    const stored = localStorage.getItem(PHOTOS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function savePhotos(photos: Photo[]) {
  try {
    localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(photos))
  } catch (err) {
    console.error('[Photos] Failed to save photos:', err)
  }
}

export function addPhoto(photo: Photo) {
  const existing = getStoredPhotos()
  existing.unshift(photo)
  savePhotos(existing)
  return photo
}

export function addPhotos(photos: Photo[]) {
  const existing = getStoredPhotos()
  existing.unshift(...photos)
  savePhotos(existing)
}

export function updatePhoto(id: string, updates: Partial<Photo>): Photo | null {
  const photos = getStoredPhotos()
  const index = photos.findIndex(p => p.id === id)
  if (index === -1) return null

  photos[index] = { ...photos[index], ...updates }
  savePhotos(photos)
  return photos[index]
}

export function deletePhoto(id: string): boolean {
  const photos = getStoredPhotos()
  const filtered = photos.filter(p => p.id !== id)
  if (filtered.length === photos.length) return false

  savePhotos(filtered)
  return true
}

export function extractDateFromFilename(filename: string): number {
  // Extract date pattern like "Jan 07 2026 09_50am" from "1-Jan 07 2026 09_50am-KFxg.jpg"
  const dateMatch = filename.match(/(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2})_(\d{2})([ap]m)/i)
  if (dateMatch) {
    const [, month, day, year, hour, minute, meridiem] = dateMatch
    let hourNum = parseInt(hour)
    if (meridiem.toLowerCase() === 'pm' && hourNum !== 12) hourNum += 12
    if (meridiem.toLowerCase() === 'am' && hourNum === 12) hourNum = 0

    const dateStr = `${month} ${day} ${year} ${hourNum}:${minute}`
    return new Date(dateStr).getTime()
  }
  return Date.now()
}
