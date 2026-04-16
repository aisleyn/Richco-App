import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, ChevronLeft, AlertTriangle, CheckCircle, Upload } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { mockPhotos, jobSites } from '../data/mockData'
import { format } from 'date-fns'
import type { Photo, PhotoCategory } from '../types'

const categories: PhotoCategory[] = ['Foundation', 'Framing', 'Electrical', 'Site Conditions', 'Finish Work', 'Other']

export function PhotosScreen(_props: { onNavigate?: (s: string) => void }) {
  const [activeSite, setActiveSite] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<PhotoCategory | 'All'>('All')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>('Site Conditions')
  const [uploadSite, setUploadSite] = useState(jobSites[0].id)
  const [caption, setCaption] = useState('')

  const sites = jobSites.filter(s => mockPhotos.some(p => p.siteId === s.id))
  const currentSite = sites.find(s => s.id === activeSite)

  const filtered = mockPhotos
    .filter(p => activeSite ? p.siteId === activeSite : true)
    .filter(p => activeCategory === 'All' ? true : p.category === activeCategory)
    .sort((a, b) => b.timestamp - a.timestamp)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setPendingPhoto(URL.createObjectURL(f))
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
            <h1 className="text-white text-2xl font-bold">{currentSite?.name ?? 'Photos'}</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {activeSite ? `${filtered.length} photos` : `${sites.length} active projects`}
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 bg-brand-amber px-3 py-2 rounded-xl text-slate-900 text-sm font-semibold"
          >
            <Camera size={15} /> Submit
          </button>
        </div>
      </div>

      {!activeSite ? (
        /* Project gallery cards */
        <div className="px-4 mt-5 space-y-3">
          {sites.map((site, i) => {
            const sitePhotos = mockPhotos.filter(p => p.siteId === site.id)
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
                    <p className="text-white font-semibold text-sm">{site.name}</p>
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

          {/* Grid */}
          <div className="grid grid-cols-3 gap-0.5 mt-3">
            {filtered.map((photo, i) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedPhoto(photo)}
                className="aspect-square relative overflow-hidden group"
              >
                <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                {/* AI flag */}
                {photo.aiFlags && photo.aiFlags.length > 0 && (
                  <div className="absolute top-1 left-1 bg-amber-500/90 rounded-md p-0.5">
                    <AlertTriangle size={10} className="text-white" />
                  </div>
                )}
                {/* Category chip */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-active:opacity-100 transition-opacity">
                  <p className="text-white text-[9px]">{photo.category}</p>
                </div>
              </motion.button>
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
              <button onClick={() => setSelectedPhoto(null)} className="text-white">
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
                  <p className="text-white font-semibold">{selectedPhoto.submittedBy}</p>
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
                <h2 className="text-white font-bold text-lg">Submit Site Photo</h2>
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
                      <X size={14} className="text-white" />
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
                  <select value={uploadSite} onChange={e => setUploadSite(e.target.value)} className="w-full bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm appearance-none">
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
                  <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Describe what's shown..." className="w-full bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600" />
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
    </AppLayout>
  )
}
