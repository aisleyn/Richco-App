import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Image, Trash2, Plus, X, Maximize2 } from 'lucide-react'
import { uploadCrewFile, updateCrewMemberFiles } from '../../services/supabase'

interface DocumentItem {
  name: string
  url: string
  path: string
  uploadedDate: number
}

interface EmployeeDocumentManagerProps {
  email: string
  fileType: 'identification' | 'qualification' | 'employment_file'
  documents: DocumentItem[]
  isEditMode: boolean
  onDocumentsChange?: (docs: DocumentItem[]) => void
}

export function EmployeeDocumentManager({
  email,
  fileType,
  documents,
  isEditMode,
  onDocumentsChange,
}: EmployeeDocumentManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [expandedDoc, setExpandedDoc] = useState<DocumentItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileTypeLabel = {
    identification: '🪪 ID',
    qualification: '📜 Cert',
    employment_file: '📋 File',
  }[fileType]

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF and images supported')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const result = await uploadCrewFile(email, fileType, file)
      if (result) {
        const newDoc: DocumentItem = {
          name: result.name,
          url: result.url,
          path: result.path,
          uploadedDate: Date.now(),
        }
        const updated = [...documents, newDoc]

        // PERSIST TO DATABASE - this is critical for document permanence
        const updates: any = {}
        if (fileType === 'identification') {
          updates.identification = {
            type: 'passport',
            url: newDoc.url,
            uploadedDate: newDoc.uploadedDate,
          }
        } else if (fileType === 'qualification') {
          updates.qualifications = updated.map(doc => ({
            name: doc.name,
            url: doc.url,
            uploadedDate: doc.uploadedDate,
          }))
        } else if (fileType === 'employment_file') {
          updates.employmentFiles = updated.map(doc => ({
            name: doc.name,
            type: 'other',
            url: doc.url,
            uploadedDate: doc.uploadedDate,
          }))
        }

        await updateCrewMemberFiles(email, updates)
        onDocumentsChange?.(updated)
      } else {
        setError('Upload failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload error')
    } finally {
      setIsUploading(false)
    }
  }

  // Display mode - show icons only
  if (!isEditMode) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
          {fileTypeLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {documents.map((doc, idx) => {
            const isImage = doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)
            const isPdf = doc.name.toLowerCase().match(/\.pdf$/i)

            return (
              <motion.button
                key={idx}
                onClick={() => setExpandedDoc(doc)}
                className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors group"
                title={doc.name}
              >
                {isImage ? (
                  <Image size={20} className="text-blue-600 dark:text-blue-400" />
                ) : isPdf ? (
                  <FileText size={20} className="text-red-600 dark:text-red-400" />
                ) : (
                  <FileText size={20} className="text-slate-600 dark:text-slate-400" />
                )}
                <p className="text-xs mt-1 text-slate-600 dark:text-slate-400 truncate max-w-[60px] group-hover:underline">
                  {doc.name.split('.')[0].substring(0, 8)}
                </p>
              </motion.button>
            )
          })}
        </div>

        {/* Full-screen viewer */}
        <AnimatePresence>
          {expandedDoc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedDoc(null)}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-black rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <p className="text-white font-semibold text-sm truncate">{expandedDoc.name}</p>
                  <button
                    onClick={() => setExpandedDoc(null)}
                    className="p-1 hover:bg-slate-800 rounded transition-colors"
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center">
                  {expandedDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={expandedDoc.url} alt={expandedDoc.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-white">
                      <FileText size={48} />
                      <p className="text-lg font-semibold">{expandedDoc.name}</p>
                      <a
                        href={expandedDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                      >
                        Open in New Tab
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Edit mode - show full management interface
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
          {fileTypeLabel}
        </p>
        <label className="flex items-center gap-1 px-3 py-1 text-xs bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg cursor-pointer font-semibold transition-colors">
          <Plus size={14} />
          Add
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {isUploading && (
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
          Uploading...
        </div>
      )}

      <div className="space-y-2">
        {documents.map((doc, idx) => {
          const isImage = doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i)
          const isPdf = doc.name.toLowerCase().match(/\.pdf$/i)

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isImage ? (
                  <Image size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                ) : isPdf ? (
                  <FileText size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                ) : (
                  <FileText size={16} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {doc.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {new Date(doc.uploadedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setExpandedDoc(doc)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                  title="View"
                >
                  <Maximize2 size={14} className="text-slate-600 dark:text-slate-400" />
                </button>
                <button
                  onClick={async () => {
                    const updated = documents.filter((_, i) => i !== idx)

                    // PERSIST DELETION TO DATABASE
                    const updates: any = {}
                    if (fileType === 'identification' && updated.length === 0) {
                      updates.identification = undefined
                    } else if (fileType === 'qualification') {
                      updates.qualifications = updated.map(doc => ({
                        name: doc.name,
                        url: doc.url,
                        uploadedDate: doc.uploadedDate,
                      }))
                    } else if (fileType === 'employment_file') {
                      updates.employmentFiles = updated.map(doc => ({
                        name: doc.name,
                        type: 'other',
                        url: doc.url,
                        uploadedDate: doc.uploadedDate,
                      }))
                    }

                    try {
                      await updateCrewMemberFiles(email, updates)
                      onDocumentsChange?.(updated)
                    } catch (err) {
                      console.error('Failed to delete document:', err)
                    }
                  }}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {documents.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-2 italic">
          No documents uploaded
        </p>
      )}

      {/* Full-screen viewer for edit mode */}
      <AnimatePresence>
        {expandedDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedDoc(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <p className="text-white font-semibold text-sm truncate">{expandedDoc.name}</p>
                <button
                  onClick={() => setExpandedDoc(null)}
                  className="p-1 hover:bg-slate-800 rounded transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center">
                {expandedDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={expandedDoc.url} alt={expandedDoc.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-white">
                    <FileText size={48} />
                    <p className="text-lg font-semibold">{expandedDoc.name}</p>
                    <a
                      href={expandedDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
                    >
                      Open in New Tab
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
