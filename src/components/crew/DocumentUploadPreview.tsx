import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileUp, Maximize2, ChevronLeft, ChevronRight, Loader } from 'lucide-react'
import { uploadCrewFile } from '../../services/supabase'

interface Document {
  name: string
  url: string
  path: string
  uploadedDate: number
}

interface DocumentUploadPreviewProps {
  email: string
  fileType: 'identification' | 'qualification' | 'employment_file'
  initialDocument?: Document | null
  onDocumentAdded?: (doc: Document) => void
  onDocumentRemoved?: () => void
}

export function DocumentUploadPreview({
  email,
  fileType,
  initialDocument,
  onDocumentAdded,
  onDocumentRemoved,
}: DocumentUploadPreviewProps) {
  const [document, setDocument] = useState<Document | null>(initialDocument || null)
  const [isUploading, setIsUploading] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isImage = document?.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)
  const isPdf = document?.name.toLowerCase().match(/\.pdf$/i)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF and image files (JPG, PNG, GIF, WebP) are supported')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const result = await uploadCrewFile(email, fileType, file)

      if (result) {
        const newDoc: Document = {
          name: result.name,
          url: result.url,
          path: result.path,
          uploadedDate: Date.now(),
        }
        setDocument(newDoc)
        onDocumentAdded?.(newDoc)
      } else {
        setError('Failed to upload file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <label className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
        <FileUp size={16} className="text-green-600 dark:text-green-400" />
        <span className="text-sm font-semibold text-green-700 dark:text-green-300">
          {document ? 'Replace Document' : 'Upload Document'}
        </span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />
      </label>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isUploading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <Loader size={16} className="animate-spin" />
          Uploading...
        </div>
      )}

      {/* Document Preview */}
      {document && !isUploading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
        >
          {/* Preview container */}
          <div className="relative bg-slate-50 dark:bg-slate-800 aspect-video flex items-center justify-center overflow-hidden">
            {isImage ? (
              <img
                src={document.url}
                alt={document.name}
                className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setExpandedIndex(0)}
              />
            ) : isPdf ? (
              <div
                className="flex items-center justify-center w-full h-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setExpandedIndex(0)}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">PDF Document</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">Click to view</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">Preview not available</p>
              </div>
            )}

            {/* Expand button */}
            {(isImage || isPdf) && (
              <button
                onClick={() => setExpandedIndex(0)}
                className="absolute top-2 right-2 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow z-10"
                title="Expand"
              >
                <Maximize2 size={16} className="text-slate-600 dark:text-slate-300" />
              </button>
            )}
          </div>

          {/* Document info */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {document.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {new Date(document.uploadedDate).toLocaleDateString()}
            </p>
          </div>

          {/* Remove button */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-700 flex gap-2">
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded transition-colors text-center"
            >
              Open
            </a>
            <button
              onClick={() => {
                setDocument(null)
                onDocumentRemoved?.()
              }}
              className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded transition-colors flex items-center gap-1"
            >
              <X size={14} /> Remove
            </button>
          </div>
        </motion.div>
      )}

      {/* Full screen viewer modal */}
      <AnimatePresence>
        {expandedIndex !== null && document && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedIndex(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] bg-black rounded-lg overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <p className="text-white font-semibold truncate">{document.name}</p>
                <button
                  onClick={() => setExpandedIndex(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto flex items-center justify-center">
                {isImage ? (
                  <img
                    src={document.url}
                    alt={document.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : isPdf ? (
                  <div className="flex flex-col items-center justify-center gap-4 text-white">
                    <div className="text-6xl">📄</div>
                    <p className="text-lg font-semibold">{document.name}</p>
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                    >
                      Open PDF in New Tab
                    </a>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
