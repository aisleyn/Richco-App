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
      }
    }
  })
}

export async function getStoredPhotos(): Promise<Photo[]> {
  try {
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

export async function savePhotos(photos: Photo[]): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    // Clear existing and add all
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

export async function addPhoto(photo: Photo): Promise<Photo> {
  try {
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

export async function addPhotos(photos: Photo[]): Promise<void> {
  try {
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
