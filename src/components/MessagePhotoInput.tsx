import { useState, useRef } from 'react'
import { X, Upload, Loader, CheckCircle } from 'lucide-react'
import { uploadMessageAttachment } from '../services/storageService'
import type { Message } from '../types'

interface Props {
  threadId: string
  onAttachmentReady: (attachment: { url: string; name: string }) => void
  onError: (error: string) => void
}

export function MessagePhotoInput({ threadId, onAttachmentReady, onError }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Only allow images and PDFs
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      onError('Only images and PDFs are allowed')
      return
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      onError('File must be smaller than 50MB')
      return
    }

    setFileName(file.name)
    setUploaded(false)

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(null) // PDF - no preview
    }

    // Upload file
    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      const result = await uploadMessageAttachment(threadId, file)

      if (result) {
        setUploaded(true)
        onAttachmentReady({ url: result.url, name: file.name })
      } else {
        onError('Failed to upload file')
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    setPreview(null)
    setFileName(null)
    setUploaded(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!preview && !fileName) {
    return (
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
        title="Attach photo or file"
      >
        <Upload size={18} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </button>
    )
  }

  return (
    <div className="mb-3 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {preview ? (
            <img src={preview} alt="Preview" className="w-10 h-10 rounded object-cover" />
          ) : (
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-600 rounded flex items-center justify-center text-xs text-slate-600 dark:text-slate-400">
              PDF
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              {fileName}
            </p>
            {uploading ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Loader size={12} className="animate-spin" /> Uploading...
              </p>
            ) : uploaded ? (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle size={12} /> Uploaded
              </p>
            ) : null}
          </div>
        </div>
        <button
          onClick={handleClear}
          disabled={uploading}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-50"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
