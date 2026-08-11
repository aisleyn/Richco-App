import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, ChevronLeft, Edit2 } from 'lucide-react'
import { jobSites } from '../../data/mockData'
import { extractDateFromFilename, addPhotos } from '../../services/photoDatabase'
import { uploadProjectPhoto } from '../../services/storageService'
import type { Photo, PhotoCategory } from '../../types'

const categories: PhotoCategory[] = ['Foundation', 'Framing', 'Electrical', 'Site Conditions', 'Finish Work', 'Other']

interface PendingPhoto {
  file: File
  preview: string
  category: PhotoCategory
  caption: string
  timestamp: number
}

interface Props {
  siteId: string
  userEmail: string
  onClose: () => void
  onPhotosAdded: () => void
  projectId?: string
}

export function BulkUploadModal({ siteId, projectId, userEmail, onClose, onPhotosAdded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const site = jobSites.find(s => s.id === siteId)
  const editingPhoto = editingIndex !== null ? pendingPhotos[editingIndex] : null

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newPhotos: PendingPhoto[] = []
    let processed = 0

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          const timestamp = extractDateFromFilename(file.name)
          newPhotos.push({
            file,
            preview,
            category: 'Site Conditions',
            caption: '',
            timestamp,
          })
          processed++
          if (processed === Array.from(files).filter(f => f.type.startsWith('image/')).length) {
            setPendingPhotos([...pendingPhotos, ...newPhotos])
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  async function handleUpload() {
    setUploading(true)
    setUploadProgress(0)
    try {
      const photosToAdd: Photo[] = []
      const folderName = projectId || siteId  // Use projectId if available, else siteId

      // Upload each photo to Supabase and collect results
      for (let i = 0; i < pendingPhotos.length; i++) {
        const pp = pendingPhotos[i]
        try {
          // Show progress
          setUploadProgress(Math.round((i / pendingPhotos.length) * 100))

          // Upload to Supabase project-photos bucket
          const result = await uploadProjectPhoto(folderName, pp.file)

          if (result) {
            photosToAdd.push({
              id: `photo-${Date.now()}-${i}`,
              url: result.url,  // ✅ Use Supabase public URL instead of data URL
              thumbnailUrl: result.url,  // ✅ Same URL (Supabase handles thumbnails)
              siteId,
              siteName: site?.name || 'Unknown Site',
              projectId,
              submittedBy: 'Bulk Upload',
              submittedById: 'bulk',
              timestamp: pp.timestamp,
              category: pp.category,
              caption: pp.caption,
            })
          } else {
            console.error(`[BulkUpload] Failed to upload photo ${i + 1}/${pendingPhotos.length}`)
          }
        } catch (err) {
          console.error(`[BulkUpload] Error uploading photo ${i + 1}:`, err)
        }
      }

      // Save uploaded photos to database
      if (photosToAdd.length > 0) {
        await addPhotos(photosToAdd, userEmail)
        console.log(`[BulkUpload] Successfully uploaded ${photosToAdd.length}/${pendingPhotos.length} photos`)
      } else {
        console.warn('[BulkUpload] No photos were successfully uploaded')
      }

      setUploadProgress(100)
      setPendingPhotos([])
      setEditingIndex(null)
      onPhotosAdded()
      onClose()
    } catch (err) {
      console.error('[BulkUpload] Upload error:', err)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md max-h-[90vh] overflow-y-auto"
      >
        {editingPhoto ? (
          <>
            {/* Edit mode */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setEditingIndex(null)} className="text-green-600 hover:text-green-700 flex items-center gap-1">
                <ChevronLeft size={20} /> Back
              </button>
              <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Edit Photo</h2>
              <div className="w-6" />
            </div>

            <div className="space-y-4">
              <div className="aspect-video rounded-xl overflow-hidden bg-white dark:bg-slate-700">
                <img src={editingPhoto.preview} alt="" className="w-full h-full object-cover" />
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Category
                </label>
                <select
                  value={editingPhoto.category}
                  onChange={e => {
                    const updated = [...pendingPhotos]
                    updated[editingIndex!].category = e.target.value as PhotoCategory
                    setPendingPhotos(updated)
                  }}
                  className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-green-600 placeholder:text-slate-600 dark:placeholder:text-slate-400"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Caption
                </label>
                <input
                  type="text"
                  value={editingPhoto.caption}
                  onChange={e => {
                    const updated = [...pendingPhotos]
                    updated[editingIndex!].caption = e.target.value
                    setPendingPhotos(updated)
                  }}
                  placeholder="Add a caption..."
                  className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:border-green-600"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
                  Date
                </label>
                <input
                  type="datetime-local"
                  value={new Date(editingPhoto.timestamp).toISOString().slice(0, 16)}
                  onChange={e => {
                    const updated = [...pendingPhotos]
                    updated[editingIndex!].timestamp = new Date(e.target.value).getTime()
                    setPendingPhotos(updated)
                  }}
                  className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-green-600 placeholder:text-slate-600 dark:placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingIndex(null)}
                  className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-100 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Upload mode */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold">Upload Photos</h2>
              <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Project: <span className="text-slate-800 dark:text-slate-100 font-semibold">{site?.name}</span></p>

            {pendingPhotos.length === 0 ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-600 bg-green-600/5' : 'border-slate-200 dark:border-slate-600'
                }`}
              >
                <Upload size={32} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" />
                <p className="text-slate-800 dark:text-slate-100 font-medium mb-1">Drag photos here or click to select</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">You can select multiple files at once</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-amber-500 text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Select Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => handleFiles(e.target.files)}
                  className="hidden"
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {pendingPhotos.map((photo, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative rounded-lg overflow-hidden bg-white dark:bg-slate-700"
                    >
                      <img src={photo.preview} alt="" className="w-full aspect-square object-cover" />
                      <button
                        onClick={() => setEditingIndex(i)}
                        className="absolute inset-0 bg-black/0 hover:bg-black/40 flex items-center justify-center transition-colors"
                      >
                        <Edit2 size={18} className="text-white opacity-0 hover:opacity-100" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mb-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-100 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Add More Photos
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingPhotos([])}
                    disabled={uploading}
                    className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-100 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 bg-green-600 hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-medium rounded-lg px-4 py-2.5 transition-colors"
                  >
                    {uploading ? `Uploading ${uploadProgress}%` : `Upload ${pendingPhotos.length} Photos`}
                  </button>
                </div>

                {uploading && (
                  <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
