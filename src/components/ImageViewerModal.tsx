import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Props {
  isOpen: boolean
  imageUrl: string
  fileName?: string
  onClose: () => void
  currentIndex?: number
  totalImages?: number
  onPrev?: () => void
  onNext?: () => void
}

export function ImageViewerModal({
  isOpen,
  imageUrl,
  fileName,
  onClose,
  currentIndex,
  totalImages,
  onPrev,
  onNext,
}: Props) {
  const [isLoading, setIsLoading] = useState(true)

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || 'image.jpg'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download image:', err)
    }
  }

  if (!isOpen) return null

  const hasNavigation = totalImages && totalImages > 1
  const showPrev = currentIndex !== undefined && currentIndex > 0 && onPrev
  const showNext = currentIndex !== undefined && totalImages && currentIndex < totalImages - 1 && onNext

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && showPrev) {
        onPrev?.()
      } else if (e.key === 'ArrowRight' && showNext) {
        onNext?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrev, onNext, showPrev, showNext])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] flex items-center justify-center pointer-events-auto"
        >
          {/* Close button - top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors text-white"
            title="Close"
          >
            <X size={24} />
          </button>

          {/* Download button - top right, below close */}
          <button
            onClick={handleDownload}
            className="absolute top-16 right-4 z-10 p-2.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors text-white"
            title="Download"
          >
            <Download size={24} />
          </button>

          {/* Image */}
          <div className="flex items-center justify-center w-full h-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <img
              src={imageUrl}
              alt={fileName || 'Image preview'}
              onLoad={() => setIsLoading(false)}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Navigation arrows */}
          {showPrev && (
            <button
              onClick={onPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors text-white"
              title="Previous image"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {showNext && (
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors text-white"
              title="Next image"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* Image counter */}
          {hasNavigation && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 px-3 py-1.5 rounded-full text-white text-sm font-medium">
              {(currentIndex || 0) + 1} / {totalImages}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
