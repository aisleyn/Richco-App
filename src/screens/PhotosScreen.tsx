import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, ChevronLeft, AlertTriangle, CheckCircle, Upload, Edit2, Trash2 } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { jobSites } from '../data/mockData'
import { format } from 'date-fns'
import type { Photo, PhotoCategory } from '../types'
import { getStoredPhotos, deletePhoto } from '../services/photoDatabase'
import { useAppStore } from '../store/appStore'
import { isUserAdmin } from '../services/crew'
import { BulkUploadModal } from '../components/photos/BulkUploadModal'
import { EditPhotoModal } from '../components/photos/EditPhotoModal'
import { ImportPhotosModal } from '../components/photos/ImportPhotosModal'
import { ImageViewerModal } from '../components/ImageViewerModal'

const categories: PhotoCategory[] = ['Prep', 'Application', 'Cleanup', 'Site Conditions', 'Finish Work', 'Other']

export function PhotosScreen({ onNavigate, initialProjectId }: { onNavigate?: (s: string) => void; initialProjectId?: string }) {
  const { currentUserEmail } = useAppStore()
  const [viewMode, setViewMode] = useState<'sites' | 'clock-out'>('sites')
  const [activeSite, setActiveSite] = useState<string | null>(initialProjectId ? null : null)
  const [activeProject, setActiveProject] = useState<string | null>(initialProjectId || null)
  const [activeCategory, setActiveCategory] = useState<PhotoCategory | 'All'>('All')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
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
  const [showDeleteSiteConfirm, setShowDeleteSiteConfirm] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      const admin = await isUserAdmin(currentUserEmail)
      setIsAdmin(admin)
    }
    checkAdminStatus()
  }, [currentUserEmail])

  useEffect(() => {
    const loadPhotos = async () => {
      const stored = await getStoredPhotos(currentUserEmail)
      // Only use stored photos - mockPhotos were causing deleted items to reappear
      setAllPhotos(stored)
    }
    loadPhotos()
  }, [refresh, currentUserEmail])

  const sites = jobSites.filter(s => s.status === 'active')
  const currentSite = sites.find(s => s.id === activeSite)

  // Extract unique projects from photos
  const projects = Array.from(new Map(
    allPhotos
      .filter(p => p.projectId)
      .map(p => [p.projectId, { id: p.projectId!, name: p.projectName || p.projectId! }])
  ).values())

  // Extract unique employees for clock-out view
  const clockOutPhotos = allPhotos.filter(p => p.isClockOut)
  const uniqueEmployees = Array.from(new Set(clockOutPhotos.map(p => p.submittedBy))).sort()

  const currentProject = projects.find(p => p.id === activeProject)

  const filtered = allPhotos
    .filter(p => {
      // Clock-out view: only show clock-out photos for the selected site
      if (viewMode === 'clock-out' && activeSite) {
        return p.isClockOut && p.siteId === activeSite
      }
      // Sites view: show non-clock-out photos
      if (viewMode === 'sites' && activeSite) {
        return !p.isClockOut && p.siteId === activeSite
      }
      return false
    })
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

  async function handleBulkDelete() {
    for (const id of selectedForDelete) {
      const photo = allPhotos.find(p => p.id === id)
      await deletePhoto(id, photo, currentUserEmail)
    }
    setSelectedForDelete(new Set())
    setDeleteMode(false)
    setRefresh(prev => prev + 1)
  }

  async function handleDeleteSite() {
    if (activeSite) {
      const sitePhotos = allPhotos.filter(p => p.siteId === activeSite)
      for (const photo of sitePhotos) {
        await deletePhoto(photo.id, photo, currentUserEmail)
      }
      setActiveSite(null)
      setDeleteMode(false)
      setSelectedForDelete(new Set())
      setShowDeleteSiteConfirm(false)
      setRefresh(prev => prev + 1)
    }
  }

  return (
    <AppLayout noPad onNavigate={onNavigate}>
      <div className="pt-14 px-4">
        {/* View mode tabs */}
        {!activeSite && !activeProject && (
          <div className="flex gap-2 mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide pb-2">
            <button
              onClick={() => {
                setViewMode('sites')
                setActiveCategory('All')
              }}
              className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === 'sites'
                  ? 'bg-green-600 text-slate-900 border border-green-700'
                  : 'bg-bg-elevated dark:bg-bg-elevated-dark text-slate-600 dark:text-slate-400 border border-white/10'
              }`}
            >
              Sites
            </button>
            <button
              onClick={() => {
                setViewMode('clock-out')
                setActiveCategory('All')
              }}
              className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === 'clock-out'
                  ? 'bg-amber-600 text-white border border-amber-700'
                  : 'bg-bg-elevated dark:bg-bg-elevated-dark text-slate-600 dark:text-slate-400 border border-white/10'
              }`}
            >
              ⏱️ Clock Out Photos
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-1">
          {(activeSite || activeProject) && (
            <button
              onClick={() => {
                setActiveSite(null)
                setActiveProject(null)
                setDeleteMode(false)
                setSelectedForDelete(new Set())
              }}
              className="flex items-center gap-1 text-green-600 text-sm -ml-1"
            >
              <ChevronLeft size={16} /> {viewMode === 'clock-out' ? 'Clock Out Photos' : 'Sites'}
            </button>
          )}
          <div className={(activeSite || activeProject) ? '' : 'flex-1'}>
            <h1 className="text-slate-800 dark:text-slate-100 text-2xl font-bold">
              {viewMode === 'clock-out'
                ? 'Clock Out Photos'
                : (currentSite?.name ?? 'Photos')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              {viewMode === 'clock-out'
                ? `${clockOutPhotos.length} clock-out photos from ${uniqueEmployees.length} employees`
                : (activeSite
                  ? `${filtered.length} photos`
                  : `${sites.length} sites`)}
            </p>
          </div>
          <div className="flex gap-2">
            {activeSite && !deleteMode && isAdmin && (
              <>
                <button
                  onClick={() => setShowDeleteSiteConfirm(true)}
                  className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-xl text-red-500 text-sm font-semibold transition-colors"
                  title="Delete entire site category and all photos"
                >
                  <Trash2 size={15} /> Site
                </button>
                <button
                  onClick={() => setDeleteMode(true)}
                  className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-xl text-red-500 text-sm font-semibold transition-colors"
                  title="Delete individual photos"
                >
                  <Trash2 size={15} /> Photos
                </button>
              </>
            )}
            {activeSite && !deleteMode && (
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 px-3 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
                title="Import from folder"
              >
                <Upload size={15} /> Import
              </button>
            )}
            {deleteMode && (
              <>
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1.5 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-semibold hover:bg-bg-elevated dark:hover:bg-bg-elevated-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={selectAllPhotos}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 px-3 py-2 rounded-xl text-slate-900 text-sm font-semibold transition-colors"
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
                className="flex items-center gap-1.5 bg-green-600 px-3 py-2 rounded-xl text-slate-900 text-sm font-semibold"
              >
                <Camera size={15} /> Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {!activeSite && !activeProject ? (
        // Gallery - Sites, Projects, or Clock-Out Employee View
        viewMode === 'clock-out' ? (
          /* Clock Out Photos Dashboard - Grouped by Employee */
          <>
            <div className="px-4 mt-5 mb-4">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Click any employee to view and manage their clock-out photos</p>
            </div>

            {/* Clock Out Gallery Cards */}
            <div className="px-4">
              {uniqueEmployees.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <Camera size={32} className="mx-auto mb-3 opacity-50" />
                  <p>No clock-out photos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uniqueEmployees.map((employeeName, i) => {
                    const employeePhotos = clockOutPhotos.filter(p => p.submittedBy === employeeName)
                    const sitesWorked = Array.from(new Set(employeePhotos.map(p => p.siteName))).sort()
                    return (
                      <motion.button
                        key={employeeName}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        onClick={() => {
                          if (employeePhotos.length > 0) {
                            setActiveSite(employeePhotos[0].siteId)
                            setActiveCategory('All')
                          }
                        }}
                        className="text-left bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 overflow-hidden active:bg-amber-100 dark:active:bg-amber-900/50 transition-colors shadow-md"
                      >
                        {/* Photo strip preview */}
                        <div className="flex h-24 lg:h-32 gap-0.5 overflow-hidden bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900 dark:to-amber-950">
                          {employeePhotos.slice(0, 3).map((p, j) => (
                            <div key={j} className="flex-1 overflow-hidden">
                              <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {employeePhotos.length === 0 && <div className="flex-1 flex items-center justify-center"><Camera size={24} className="text-amber-400 opacity-50" /></div>}
                        </div>
                        <div className="p-4">
                          <p className="text-slate-900 dark:text-white font-semibold text-sm">{employeeName}</p>
                          <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">{employeePhotos.length} clock-out photos</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">{sitesWorked.join(', ')}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Gallery - Sites view */
          <>
            <div className="px-4 mt-5 mb-4">
              <p className="text-slate-600 dark:text-slate-400 text-sm">Click any site to view and manage photos</p>
            </div>

          {/* Gallery cards */}
          <div className="px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((item, i) => {
                const itemPhotos = allPhotos.filter(p => p.siteId === item.id && !p.isClockOut)
                const flagged = itemPhotos.filter(p => p.aiFlags && p.aiFlags.length > 0).length
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => {
                      setActiveSite(item.id)
                    }}
                    className="text-left bg-bg-surface dark:bg-bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden active:bg-bg-elevated dark:active:bg-bg-elevated-dark transition-colors shadow-md"
                  >
                    {/* Photo strip preview */}
                    <div className="flex h-24 lg:h-32 gap-0.5 overflow-hidden">
                        {itemPhotos.slice(0, 3).map((p, j) => (
                        <div key={j} className="flex-1 overflow-hidden">
                          <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {itemPhotos.length === 0 && <div className="flex-1 bg-bg-elevated dark:bg-bg-elevated-dark flex items-center justify-center"><Camera size={24} className="text-slate-600 dark:text-slate-500" /></div>}
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-slate-800 dark:text-slate-100 font-semibold text-sm">{item.name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{itemPhotos.length} photos</p>
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
          </div>
        </>
        )
      ) : (
        /* Photo gallery */
        <div>
          {/* Category filters - hide for clock-out view */}
          {viewMode !== 'clock-out' && (
            <div className="flex gap-2 overflow-x-auto px-4 mt-4 pb-1 scrollbar-hide">
              {(['All', ...categories] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-green-600 text-slate-900 border border-green-700' : 'bg-bg-elevated dark:bg-bg-elevated-dark text-slate-400 dark:text-slate-500 border border-white/10 dark:border-white/5'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Clock-out view header with employee info */}
          {viewMode === 'clock-out' && activeSite && (
            <div className="px-4 mt-4 pb-3 border-b border-amber-200 dark:border-amber-900/30">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                📊 Clock-out photos grouped by date
              </p>
            </div>
          )}

          {/* Grid by month - or by date for clock-out */}
          <div className="mt-3 space-y-6 px-4">
            {viewMode === 'clock-out' && activeSite
              ? // Clock-out view: show only clock-out photos for this site, grouped by employee then date
                (() => {
                  const siteClockOutPhotos = clockOutPhotos.filter(p => p.siteId === activeSite)
                  const photosByEmployeeAndMonth = siteClockOutPhotos.reduce((acc, photo) => {
                    const employee = photo.submittedBy
                    const date = new Date(photo.timestamp)
                    const monthKey = `${date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`
                    const groupKey = `${employee} - ${monthKey}`
                    if (!acc[groupKey]) {
                      acc[groupKey] = []
                    }
                    acc[groupKey].push(photo)
                    return acc
                  }, {} as Record<string, typeof siteClockOutPhotos>)

                  return Object.entries(photosByEmployeeAndMonth).map(([groupKey, photos]) => (
                    <div key={groupKey}>
                      <h3 className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        {groupKey}
                      </h3>
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
                              onClick={() => {
                                if (deleteMode) {
                                  togglePhotoSelect(photo.id)
                                } else {
                                  setSelectedPhoto(photo)
                                  setSelectedPhotoIndex(filtered.findIndex(p => p.id === photo.id))
                                }
                              }}
                              className={`w-full h-full ${deleteMode && selectedForDelete.has(photo.id) ? 'ring-2 ring-red-500' : ''}`}
                            >
                              <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                              {/* AI flag */}
                              {photo.aiFlags && photo.aiFlags.length > 0 && (
                                <div className="absolute top-1 left-1 bg-amber-500/90 rounded-md p-0.5">
                                  <AlertTriangle size={10} className="text-slate-800" />
                                </div>
                              )}
                              {/* Clock out badge */}
                              <div className="absolute top-1 right-1 bg-amber-500/90 rounded-md px-1.5 py-0.5">
                                <p className="text-slate-800 text-[8px] font-semibold">⏱️ CLOCK-OUT</p>
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
                                className="absolute top-1 right-1 bg-green-600/90 rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Edit photo"
                              >
                                <Edit2 size={12} className="text-slate-900" />
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))
                })()
              : // Regular view: show photos by month
                Object.entries(photosByMonth).map(([month, photos]) => (
                  <div key={month}>
                    <h3 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">{month}</h3>
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
                  onClick={() => {
                    if (deleteMode) {
                      togglePhotoSelect(photo.id)
                    } else {
                      setSelectedPhoto(photo)
                      setSelectedPhotoIndex(filtered.findIndex(p => p.id === photo.id))
                    }
                  }}
                  className={`w-full h-full ${deleteMode && selectedForDelete.has(photo.id) ? 'ring-2 ring-red-500' : ''}`}
                >
                  <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" />
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
                    className="absolute top-1 right-1 bg-green-600/90 rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Image viewer modal with carousel */}
      <ImageViewerModal
        isOpen={selectedPhoto !== null}
        imageUrl={selectedPhoto?.url || ''}
        fileName={`${selectedPhoto?.category || 'photo'}-${selectedPhoto?.timestamp}`}
        onClose={() => setSelectedPhoto(null)}
        currentIndex={selectedPhotoIndex}
        totalImages={filtered.length}
        onPrev={() => {
          if (selectedPhotoIndex > 0) {
            const newIndex = selectedPhotoIndex - 1
            setSelectedPhotoIndex(newIndex)
            setSelectedPhoto(filtered[newIndex])
          }
        }}
        onNext={() => {
          if (selectedPhotoIndex < filtered.length - 1) {
            const newIndex = selectedPhotoIndex + 1
            setSelectedPhotoIndex(newIndex)
            setSelectedPhoto(filtered[newIndex])
          }
        }}
      />

      {/* Photo details overlay (below image viewer) */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/90 to-transparent px-4 py-6 pointer-events-none"
          >
            <div className="max-w-2xl mx-auto space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-200 font-semibold">{selectedPhoto.submittedBy}</p>
                  <p className="text-slate-400 text-sm">{format(selectedPhoto.timestamp, 'MMM d, yyyy · h:mm a')}</p>
                </div>
                <span className="text-slate-400 text-xs bg-slate-800/50 px-2.5 py-1 rounded">{selectedPhoto.category}</span>
              </div>

              {selectedPhoto.aiFlags && selectedPhoto.aiFlags.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                  <p className="text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={12} /> AI Flag: {selectedPhoto.aiFlags.join(', ')}
                  </p>
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
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center sm:justify-center">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-bg-base w-full sm:max-w-4xl rounded-t-3xl sm:rounded-2xl overflow-hidden"
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
                    className="w-full h-40 border-2 border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center gap-3 text-slate-400 active:border-blue-600/50"
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${uploadCategory === c ? 'bg-green-600 text-slate-900 border border-green-700' : 'bg-bg-surface text-slate-400 border border-white/10'}`}
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
                  className="w-full py-4 bg-green-600 disabled:opacity-40 rounded-xl text-slate-900 font-bold flex items-center justify-center gap-2"
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
            userEmail={currentUserEmail}
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
            userEmail={currentUserEmail}
            siteName={currentSite?.name || 'Project'}
            onClose={() => setShowImport(false)}
            onPhotosAdded={() => setRefresh(prev => prev + 1)}
          />
        )}
      </AnimatePresence>

      {/* Bulk upload modal */}
      <AnimatePresence>
        {showBulkUpload && (activeSite || activeProject) && (
          <BulkUploadModal
            siteId={activeSite || activeProject || 'site-default'}
            projectId={activeProject || undefined}
            userEmail={currentUserEmail}
            onClose={() => setShowBulkUpload(false)}
            onPhotosAdded={() => setRefresh(prev => prev + 1)}
          />
        )}
      </AnimatePresence>

      {/* Delete site confirmation modal */}
      <AnimatePresence>
        {showDeleteSiteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteSiteConfirm(false)}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Site Category?</h3>
              </div>

              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                This will permanently delete the entire <strong>{currentSite?.name}</strong> site category and all {allPhotos.filter(p => p.siteId === activeSite).length} photos within it. This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteSiteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-900 dark:text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSite}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors"
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
