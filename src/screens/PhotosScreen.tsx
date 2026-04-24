import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, ChevronLeft, AlertTriangle, CheckCircle, Upload, Edit2, Trash2 } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { mockPhotos, jobSites } from '../data/mockData'
import { format } from 'date-fns'
import type { Photo, PhotoCategory } from '../types'
import { getStoredPhotos, deletePhoto } from '../services/photoDatabase'
import { BulkUploadModal } from '../components/photos/BulkUploadModal'
import { EditPhotoModal } from '../components/photos/EditPhotoModal'
import { ImportPhotosModal } from '../components/photos/ImportPhotosModal'

const categories: PhotoCategory[] = ['Foundation', 'Framing', 'Electrical', 'Site Conditions', 'Finish Work', 'Other']

export function PhotosScreen(_props: { onNavigate?: (s: string) => void }) {
  const [activeSite, setActiveSite] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<PhotoCategory | 'All'>('All')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set())
  const [deleteMode, setDeleteMode] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>('Site Conditions')
  const [uploadSite, setUploadSite] = useState(jobSites[0].id)
  const [caption, setCaption] = useState('')
  const [allPhotos, setAllPhotos] = useState<Photo[]>([])
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const stored = getStoredPhotos()
    setAllPhotos([...stored, ...mockPhotos])
  }, [refresh])

  const sites = jobSites.filter(s => s.status === 'active')
  const currentSite = sites.find(s => s.id === activeSite)

  const filtered = allPhotos
    .filter(p => activeSite ? p.siteId === activeSite : true)
    .filter(p => activeCategory === 'All' ? true : p.category === activeCategory)
    .sort((a, b) => b.timestamp - a.timestamp)

  // Group photos by month
  const photosByMonth = filtered.reduce((acc, photo) => {
    const date = new Date(photo.timestamp)
    const monthKey = `${date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(photo)
    return acc
  }, {} as Record<string, Photo[]>)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setPendingPhoto(URL.createObjectURL(f))
  }

  function togglePhotoSelect(photoId: string) {
    const updated = new Set(selectedForDelete)
    if (updated.has(photoId)) {
      updated.delete(photoId)
    } else {
      updated.add(photoId)
    }
    setSelectedForDelete(updated)
  }

  function selectAllPhotos() {
    setSelectedForDelete(new Set(filtered.map(p => p.id)))
  }

  function clearSelection() {
    setSelectedForDelete(new Set())
  }

  function handleBulkDelete() {
    selectedForDelete.forEach(id => {
      deletePhoto(id)
    })
    setSelectedForDelete(new Set())
    setDeleteMode(false)
    setRefresh(prev => prev + 1)
  }

  return (
    <AppLayout noPad>
      <div className="pt-14 px-4">
        <div className="flex items-center justify-between mb-1">
          {activeSite && (
            <button onClick={() => setActiveSite(null)} className="flex items-center gap-1 text-brand-amber text-sm -ml-1">
              <ChevronLeft size={16} /> Sites
            </button>
          )}
          <div className={activeSite ? '' : 'flex-1'}>
            <h1 className="text-slate-800 text-2xl font-bold">{currentSite?.name ?? 'Photos'}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {activeSite ? `${filtered.length} photos` : `${sites.length} active projects`}
            </p>
          </div>
          <div className="flex gap-2">
            {activeSite && !deleteMode && (
              <>
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 px-3 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
                  title="Import from folder"
                >
                  <Upload size={15} /> Import
                </button>
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
                  title="Bulk upload photos"
                >
                  <Upload size={15} />
                </button>
              </>
            )}
            {activeSite && !deleteMode && (
              <button
                onClick={() => setDeleteMode(true)}
                className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-xl text-red-500 text-sm font-semibold transition-colors"
                title="Delete photos"
              >
                <Trash2 size={15} />
              </button>
            )}
            {deleteMode && (
              <>
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1.5 bg-bg-surface border border-slate-200 px-3 py-2 rounded-xl text-slate-800 text-sm font-semibold hover:bg-bg-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={selectAllPhotos}
                  className="flex items-center gap-1.5 bg-brand-amber hover:bg-amber-500 px-3 py-2 rounded-xl text-slate-900 text-sm font-semibold transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedForDelete.size === 0}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
                >
                  Delete {selectedForDelete.size}
                </button>
              </>
            )}
            {!deleteMode && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 bg-brand-amber px-3 py-2 rounded-xl text-slate-900 text-sm font-semibold"
              >
                <Camera size={15} /> Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {!activeSite ? (
        /* Project gallery cards */
        <div className="px-4 mt-5 space-y-3">
          {sites.map((site, i) => {
            const sitePhotos = allPhotos.filter(p => p.siteId === site.id)
            const flagged = sitePhotos.filter(p => p.aiFlags && p.aiFlags.length > 0).length
            return (
              <motion.button
                key={site.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setActiveSite(site.id)}
                className="w-full text-left bg-bg-surface rounded-2xl border border-slate-200 overflow-hidden active:bg-bg-elevated transition-colors"
              >
                {/* Photo strip preview */}
                <div className="flex h-24 gap-0.5 overflow-hidden">
                  {sitePhotos.slice(0, 3).map((p, j) => (
                    <div key={j} className="flex-1 overflow-hidden">
                      <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {sitePhotos.length === 0 && <div className="flex-1 bg-bg-elevated flex items-center justify-center"><Camera size={24} className="text-slate-600" /></div>}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-slate-800 font-semibold text-sm">{site.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{sitePhotos.length} photos</p>
                  </div>
                  {flagged > 0 && (
                    <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                      <AlertTriangle size={12} className="text-amber-400" />
                      <span className="text-amber-400 text-xs font-medium">{flagged} flagged</span>
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      ) : (
        /* Photo gallery */
        <div>
          {/* Category filters */}
          <div className="flex gap-2 overflow-x-auto px-4 mt-4 pb-1 scrollbar-hide">
            {(['All', ...categories] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-brand-amber text-slate-900' : 'bg-bg-surface text-slate-400 border border-white/10'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid by month */}
          <div className="mt-3 space-y-6">
            {Object.entries(photosByMonth).map(([month, photos]) => (
              <div key={month}>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{month}</h3>
                <div className="grid grid-cols-3 gap-0.5">
                  {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="aspect-square relative overflow-hidden group"
              >
                <button
                  onClick={() => deleteMode ? togglePhotoSelect(photo.id) : setSelectedPhoto(photo)}
                  className={`w-full h-full ${deleteMode && selectedForDelete.has(photo.id) ? 'ring-2 ring-red-500' : ''}`}
                >
                  <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  {/* AI flag */}
                  {photo.aiFlags && photo.aiFlags.length > 0 && (
                    <div className="absolute top-1 left-1 bg-amber-500/90 rounded-md p-0.5">
                      <AlertTriangle size={10} className="text-slate-800" />
                    </div>
                  )}
                  {/* Category chip */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-active:opacity-100 transition-opacity">
                    <p className="text-slate-800 text-[9px]">{photo.category}</p>
                  </div>
                </button>
                {deleteMode ? (
                  <div className="absolute top-1 right-1 bg-red-500 rounded-md p-0.5">
                    <div className={`w-4 h-4 rounded border-2 border-white flex items-center justify-center ${selectedForDelete.has(photo.id) ? 'bg-red-500' : ''}`}>
                      {selectedForDelete.has(photo.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setEditingPhoto(photo)
                    }}
                    className="absolute top-1 right-1 bg-brand-amber/90 rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit photo"
                  >
                    <Edit2 size={12} className="text-slate-900" />
                  </button>
                )}
                  </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo detail modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 pt-12 pb-4">
              <button onClick={() => setSelectedPhoto(null)} className="text-slate-800">
                <ChevronLeft size={24} />
              </button>
              <span className="text-slate-300 text-sm">{selectedPhoto.category}</span>
              <div className="w-6" />
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
              <img src={selectedPhoto.url} alt="" className="w-full max-h-full object-contain rounded-xl" />
            </div>

            <div className="px-4 py-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-800 font-semibold">{selectedPhoto.submittedBy}</p>
                  <p className="text-slate-400 text-sm">{format(selectedPhoto.timestamp, 'MMM d, yyyy · h:mm a')}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
                  <CheckCircle size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 text-xs">{Math.round((selectedPhoto.aiConfidence ?? 0) * 100)}% AI</span>
                </div>
              </div>

              {selectedPhoto.aiFlags && selectedPhoto.aiFlags.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <p className="text-amber-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} /> AI Flag
                  </p>
                  {selectedPhoto.aiFlags.map((f, i) => <p key={i} className="text-amber-200 text-sm">{f}</p>)}
                </div>
              )}

              {selectedPhoto.caption && <p className="text-slate-300 text-sm">{selectedPhoto.caption}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-bg-base w-full rounded-t-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-200">
                <h2 className="text-slate-800 font-bold text-lg">Submit Site Photo</h2>
                <button onClick={() => { setShowUpload(false); setPendingPhoto(null) }} className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                {/* Photo preview */}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                {pendingPhoto ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={pendingPhoto} alt="" className="w-full h-48 object-cover" />
                    <button onClick={() => setPendingPhoto(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center">
                      <X size={14} className="text-slate-800" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-40 border-2 border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400 active:border-brand-amber/50"
                  >
                    <Camera size={28} />
                    <span className="text-sm">Tap to take or select photo</span>
                  </button>
                )}

                {/* Site */}
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-medium block mb-2">Project Site</label>
                  <select value={uploadSite} onChange={e => setUploadSite(e.target.value)} className="w-full bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-slate-800 text-sm appearance-none">
                    {jobSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-medium block mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button
                        key={c}
                        onClick={() => setUploadCategory(c)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${uploadCategory === c ? 'bg-brand-amber text-slate-900' : 'bg-bg-surface text-slate-400 border border-white/10'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-medium block mb-2">Caption (Optional)</label>
                  <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Describe what's shown..." className="w-full bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-slate-800 text-sm placeholder:text-slate-600" />
                </div>

                <button
                  onClick={() => { setShowUpload(false); setPendingPhoto(null) }}
                  disabled={!pendingPhoto}
                  className="w-full py-4 bg-brand-amber disabled:opacity-40 rounded-xl text-slate-900 font-bold flex items-center justify-center gap-2"
                >
                  <Upload size={16} /> Submit Photo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit photo modal */}
      <AnimatePresence>
        {editingPhoto && (
          <EditPhotoModal
            photo={editingPhoto}
            onClose={() => setEditingPhoto(null)}
            onUpdated={() => setRefresh(prev => prev + 1)}
            onDeleted={() => setRefresh(prev => prev + 1)}
          />
        )}
      </AnimatePresence>

      {/* Import modal */}
      <AnimatePresence>
        {showImport && activeSite && (
          <ImportPhotosModal
            siteId={activeSite}
            siteName={currentSite?.name || 'Project'}
            onClose={() => setShowImport(false)}
            onPhotosAdded={() => setRefresh(prev => prev + 1)}
          />
        )}
      </AnimatePresence>

      {/* Bulk upload modal */}
      <AnimatePresence>
        {showBulkUpload && activeSite && (
          <BulkUploadModal
            siteId={activeSite}
            onClose={() => setShowBulkUpload(false)}
            onPhotosAdded={() => setRefresh(prev => prev + 1)}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
