import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Trash2 } from 'lucide-react'
import { updatePhoto, deletePhoto } from '../../services/photoStorage'
import type { Photo, PhotoCategory } from '../../types'
import { format } from 'date-fns'

const categories: PhotoCategory[] = ['Foundation', 'Framing', 'Electrical', 'Site Conditions', 'Finish Work', 'Other']

interface Props {
  photo: Photo
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}

export function EditPhotoModal({ photo, onClose, onUpdated, onDeleted }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    category: photo.category,
    caption: photo.caption || '',
    timestamp: photo.timestamp,
  })
  const [showDelete, setShowDelete] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      updatePhoto(photo.id, {
        category: formData.category,
        caption: formData.caption || undefined,
        timestamp: formData.timestamp,
      })
      onUpdated()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  function handleDelete() {
    if (deletePhoto(photo.id)) {
      onDeleted()
      onClose()
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
          <h2 className="text-slate-900 text-xl font-bold">Edit Photo</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Preview */}
          <div className="aspect-video rounded-xl overflow-hidden bg-bg-surface">
            <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </div>

          {/* Category */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Category
            </label>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as PhotoCategory })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={new Date(formData.timestamp).toISOString().slice(0, 16)}
              onChange={e => setFormData({ ...formData, timestamp: new Date(e.target.value).getTime() })}
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-brand-amber"
            />
          </div>

          {/* Caption */}
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 block">
              Caption
            </label>
            <textarea
              value={formData.caption}
              onChange={e => setFormData({ ...formData, caption: e.target.value })}
              placeholder="Add a caption..."
              className="w-full bg-bg-surface border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand-amber resize-none h-20"
            />
          </div>

          {/* Current info */}
          <div className="bg-bg-surface rounded-lg p-3 text-xs text-slate-500">
            <p>Submitted by: <span className="text-slate-700">{photo.submittedBy}</span></p>
            <p>Uploaded: <span className="text-slate-700">{format(photo.timestamp, 'MMM d, yyyy h:mm a')}</span></p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="flex-1 bg-bg-surface border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium text-sm hover:bg-bg-elevated transition-colors"
            >
              Cancel
            </button>
            {showDelete ? (
              <>
                <button
                  onClick={() => setShowDelete(false)}
                  className="flex-1 bg-bg-surface border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium text-sm hover:bg-bg-elevated transition-colors"
                >
                  Keep
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 rounded-lg px-4 py-2.5 text-white font-medium text-sm transition-colors"
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowDelete(true)}
                  className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                  title="Delete photo"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-brand-amber hover:bg-amber-500 disabled:opacity-50 rounded-lg px-4 py-2.5 text-slate-900 font-medium text-sm transition-colors"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
