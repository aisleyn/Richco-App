import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Loader, Download, Trash2, File, FileText, Image as ImageIcon } from 'lucide-react'
import { uploadDocument, deleteStorageFile } from '../services/storageService'

interface StorageFile {
  id: string
  name: string
  url: string
  path: string
  size: number
  type: string
  uploadedAt: Date
}

interface Props {
  projectId: string
  onFilesChange?: (files: StorageFile[]) => void
}

export function FilesManager({ projectId, onFilesChange }: Props) {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    setUploading(true)
    setError(null)

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]

      try {
        const result = await uploadDocument(projectId, file)
        if (result) {
          const newFile: StorageFile = {
            id: `file-${Date.now()}-${i}`,
            name: file.name,
            url: result.url,
            path: result.path,
            size: file.size,
            type: file.type,
            uploadedAt: new Date(),
          }
          setFiles(prev => [newFile, ...prev])
          setSuccess(`Uploaded ${file.name}`)
          setTimeout(() => setSuccess(null), 3000)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (onFilesChange) {
      onFilesChange(files)
    }
  }

  const handleDeleteFile = async (file: StorageFile) => {
    if (!window.confirm(`Delete ${file.name}?`)) return

    try {
      const success = await deleteStorageFile('documents', file.path)
      if (success) {
        setFiles(prev => prev.filter(f => f.id !== file.id))
        setSuccess(`Deleted ${file.name}`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError('Failed to delete file')
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon size={16} />
    if (type.includes('pdf')) return <FileText size={16} />
    return <File size={16} />
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
        <Upload size={32} className="mx-auto text-slate-400 dark:text-slate-500 mb-2" />
        <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">Upload Documents</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          PDFs, Word docs, spreadsheets, etc.
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
        >
          {uploading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={16} />
              Select Files
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Files ({files.length})
          </h3>
          {files.map(file => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
            >
              <div className="text-slate-600 dark:text-slate-400">
                {getFileIcon(file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {formatSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors text-slate-600 dark:text-slate-400"
                  title="Download"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => handleDeleteFile(file)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition-colors text-red-600 dark:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {files.length === 0 && !uploading && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
          No files yet
        </p>
      )}
    </div>
  )
}
