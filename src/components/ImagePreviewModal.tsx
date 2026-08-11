import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'

interface Props {
  isOpen: boolean
  imageUrl: string
  fileName: string
  onConfirm: () => void
  onCancel: () => void
  isUploading?: boolean
}

export function ImagePreviewModal({ isOpen, imageUrl, fileName, onConfirm, onCancel, isUploading }: Props) {
  const [zoom, setZoom] = useState(1)

  if (!isOpen) return null

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.5, Math.min(3, zoom + delta))
    setZoom(newZoom)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Preview Image
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {fileName}
              </p>
            </div>
            <button
              onClick={onCancel}
              disabled={isUploading}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image preview area */}
          <div className="flex-1 overflow-auto bg-black flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={imageUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Zoom controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleZoom(-0.2)}
                  disabled={zoom <= 0.5 || isUploading}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom out"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-fit">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => handleZoom(0.2)}
                  disabled={zoom >= 3 || isUploading}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom in"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  disabled={isUploading}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Reset
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={isUploading}
                  className="px-4 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Photo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
