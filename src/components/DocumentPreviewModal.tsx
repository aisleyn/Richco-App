import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ExternalLink, FileText, Loader } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getDocumentPreviewUrl, isPreviewable } from '../services/documentPreviewService'

interface Props {
  isOpen: boolean
  fileName: string
  fileUrl: string
  fileType: string
  onClose: () => void
}

export function DocumentPreviewModal({ isOpen, fileName, fileUrl, fileType, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      const url = getDocumentPreviewUrl({ url: fileUrl, fileName, fileType })
      setPreviewUrl(url)
      setLoading(false)
    }
  }, [isOpen, fileUrl, fileName, fileType])

  if (!isOpen) return null

  const canPreview = isPreviewable(fileType, fileName)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={20} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {fileName}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {fileType.split('/')[1]?.toUpperCase() || 'Document'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                title="Open in new tab"
              >
                <ExternalLink size={18} />
              </a>
              <a
                href={fileUrl}
                download
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
                title="Download"
              >
                <Download size={18} />
              </a>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto bg-slate-900">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader size={32} className="text-white animate-spin mx-auto mb-3" />
                  <p className="text-white text-sm">Loading document...</p>
                </div>
              </div>
            ) : canPreview && previewUrl ? (
              <>
                {previewUrl.includes('view.officeapps.live.com') ? (
                  // Microsoft Office Online Viewer (for DOCX)
                  <iframe
                    src={previewUrl}
                    title={fileName}
                    className="w-full h-full border-none"
                    allowFullScreen={true}
                  />
                ) : fileType.startsWith('image/') ? (
                  // Image preview
                  <div className="flex items-center justify-center h-full p-4 bg-black">
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : fileType.includes('pdf') ? (
                  // PDF preview using built-in viewer
                  <iframe
                    src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                    title={fileName}
                    className="w-full h-full border-none"
                    data-testid="pdf-viewer"
                  />
                ) : (
                  // Text/other
                  <iframe
                    src={fileUrl}
                    title={fileName}
                    className="w-full h-full border-none"
                  />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-white text-center p-8">
                <div>
                  <FileText size={48} className="mx-auto mb-3 opacity-50" />
                  <h3 className="font-semibold mb-2">Preview Not Available</h3>
                  <p className="text-sm opacity-75 mb-4">
                    This document type cannot be previewed in the browser
                  </p>
                  <div className="flex gap-3 justify-center">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      Open in New Tab
                    </a>
                    <a
                      href={fileUrl}
                      download
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
