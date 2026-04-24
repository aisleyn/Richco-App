import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, AlertCircle } from 'lucide-react'
import { addPhotos } from '../../services/photoStorage'
import type { Photo } from '../../types'

interface Props {
  siteId: string
  siteName: string
  onClose: () => void
  onPhotosAdded: () => void
}

export function ImportPhotosModal({ siteId, siteName, onClose, onPhotosAdded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  function extractDateFromFilename(filename: string): number {
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

  async function processFiles(files: FileList) {
    setImporting(true)
    setError(null)
    setProgress(0)

    try {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
      const photos: Photo[] = []

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const reader = new FileReader()

        await new Promise<void>((resolve, reject) => {
          reader.onload = (e) => {
            try {
              const dataUrl = e.target?.result as string
              const timestamp = extractDateFromFilename(file.name)

              photos.push({
                id: `photo-${Date.now()}-${i}`,
                url: dataUrl,
                thumbnailUrl: dataUrl,
                siteId,
                siteName,
                submittedBy: 'Bulk Import',
                submittedById: 'bulk',
                timestamp,
                category: 'Site Conditions',
                caption: '',
              })

              setProgress(Math.round(((i + 1) / imageFiles.length) * 100))
              resolve()
            } catch (err) {
              reject(err)
            }
          }
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
          reader.readAsDataURL(file)
        })
      }

      addPhotos(photos)
      onPhotosAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import photos')
      setImporting(false)
      setProgress(0)
    }
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
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 400, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 400, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full sm:w-full sm:max-w-md bg-bg-base rounded-t-3xl sm:rounded-2xl p-6 border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-slate-900 text-xl font-bold">Import Photos</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <p className="text-slate-500 text-sm mb-4">Project: <span className="text-slate-800 font-semibold">{siteName}</span></p>

        {importing ? (
          <div className="space-y-4">
            <div className="bg-bg-surface rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-800 text-sm font-medium">Importing photos...</span>
                <span className="text-slate-500 text-xs">{progress}%</span>
              </div>
              <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-amber to-amber-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="text-slate-500 text-xs text-center">This may take a few minutes for large folders...</p>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-brand-amber bg-brand-amber/5' : 'border-slate-200'
            }`}
          >
            <Upload size={32} className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-800 font-medium mb-1">Drag folder contents here</p>
            <p className="text-slate-500 text-sm mb-4">Or click to select photos</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-brand-amber hover:bg-amber-500 text-slate-900 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Select Photos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={e => e.target.files && processFiles(e.target.files)}
              className="hidden"
            />

            {error && (
              <div className="mt-4 bg-red-500/15 border border-red-500/30 rounded-lg p-3 flex gap-2">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm font-medium">Import failed</p>
                  <p className="text-red-300 text-xs">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
