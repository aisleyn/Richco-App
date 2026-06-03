import type { Photo } from '../types'

const DB_NAME = 'richco-photos-db'
const STORE_NAME = 'photos'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('siteId', 'siteId', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('uploadedBy', 'uploadedBy', { unique: false })
      }
    }
  })
}

function getPhotosStorageKey(userEmail: string): string {
  return `richco-photos-${userEmail.toLowerCase()}`
}

export async function getStoredPhotos(userEmail?: string): Promise<Photo[]> {
  try {
    if (userEmail) {
      // Use localStorage for per-user photo storage (cross-device sync)
      const key = getPhotosStorageKey(userEmail)
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : []
    }

    // Fallback to IndexedDB for legacy data
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as Photo[])
    })
  } catch (err) {
    console.error('[PhotoDB] Failed to get photos:', err)
    return []
  }
}

export async function savePhotos(photos: Photo[], userEmail?: string): Promise<void> {
  try {
    if (userEmail) {
      // Store in localStorage for per-user, cross-device sync
      const key = getPhotosStorageKey(userEmail)
      localStorage.setItem(key, JSON.stringify(photos))
      console.log('[PhotoDB] Saved', photos.length, 'photos for', userEmail)
      return
    }

    // Fallback to IndexedDB
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    store.clear()
    photos.forEach(photo => store.add(photo))

    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  } catch (err) {
    console.error('[PhotoDB] Failed to save photos:', err)
  }
}

export async function addPhoto(photo: Photo, userEmail?: string): Promise<Photo> {
  try {
    if (userEmail) {
      // Add to localStorage
      const key = getPhotosStorageKey(userEmail)
      const stored = localStorage.getItem(key)
      const photos = stored ? JSON.parse(stored) : []
      photos.unshift(photo) // Add to front (most recent first)
      localStorage.setItem(key, JSON.stringify(photos))
      console.log('[PhotoDB] Added photo for', userEmail)
      return photo
    }

    // Fallback to IndexedDB
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(photo)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(photo)
    })
  } catch (err) {
    console.error('[PhotoDB] Failed to add photo:', err)
    throw err
  }
}

export async function addPhotos(photos: Photo[], userEmail?: string): Promise<void> {
  try {
    if (userEmail) {
      // Add to localStorage
      const key = getPhotosStorageKey(userEmail)
      const stored = localStorage.getItem(key)
      const existing = stored ? JSON.parse(stored) : []
      const combined = [...photos, ...existing]
      localStorage.setItem(key, JSON.stringify(combined))
      console.log('[PhotoDB] Added', photos.length, 'photos for', userEmail)
      return
    }

    // Fallback to IndexedDB
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      photos.forEach(photo => store.add(photo))

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  } catch (err) {
    console.error('[PhotoDB] Failed to add photos:', err)
    throw err
  }
}

export async function updatePhoto(id: string, updates: Partial<Photo>): Promise<Photo | null> {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id)
      getRequest.onerror = () => reject(getRequest.error)
      getRequest.onsuccess = () => {
        const photo = getRequest.result as Photo
        if (!photo) {
          resolve(null)
          return
        }

        const updated = { ...photo, ...updates }
        const putRequest = store.put(updated)
        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve(updated)
      }
    })
  } catch (err) {
    console.error('[PhotoDB] Failed to update photo:', err)
    return null
  }
}

export async function deletePhoto(id: string): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve(true)
    })
  } catch (err) {
    console.error('[PhotoDB] Failed to delete photo:', err)
    return false
  }
}

export function extractDateFromFilename(filename: string): number {
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
