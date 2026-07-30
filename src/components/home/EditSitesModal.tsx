import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Archive, AlertCircle } from 'lucide-react'
import type { JobSite } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  sites: JobSite[]
  onAddSite: (site: Omit<JobSite, 'id'>) => void
  onEditSite: (id: string, updates: Partial<JobSite>) => void
  onDeleteSite: (id: string) => void
  onArchiveSite: (id: string) => void
}

export function EditSitesModal({ isOpen, onClose, sites, onAddSite, onEditSite, onDeleteSite, onArchiveSite }: Props) {
  const [activeTab, setActiveTab] = useState<'add' | 'edit' | 'archived'>('edit')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: 49.1234,
    lng: -122.7654,
    geofenceRadius: 200,
  })

  const activeSites = sites.filter(s => s.status === 'active')
  const archivedSites = sites.filter(s => s.status === 'archived' || s.status === 'inactive')

  const handleAddSite = () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      alert('Please fill in all required fields')
      return
    }

    onAddSite({
      name: formData.name,
      address: formData.address,
      lat: formData.lat,
      lng: formData.lng,
      geofenceRadius: formData.geofenceRadius,
      status: 'active',
      zone: formData.name,
    })

    setFormData({
      name: '',
      address: '',
      lat: 49.1234,
      lng: -122.7654,
      geofenceRadius: 200,
    })
    setShowAddForm(false)
  }

  const handleEditChange = (id: string, field: string, value: any) => {
    onEditSite(id, { [field]: value })
  }

  const handleArchive = (id: string) => {
    if (window.confirm('Archive this site? It will be moved to the archived section.')) {
      onArchiveSite(id)
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this site permanently? This action cannot be undone.')) {
      onDeleteSite(id)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl bg-surface rounded-2xl max-h-[90vh] overflow-y-auto shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-surface border-b border-border-light p-6 flex items-center justify-between">
            <h2 className="text-primary font-bold text-xl">Manage Sites</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center hover:bg-elevated/80 transition-colors"
            >
              <X size={18} className="text-muted" />
            </button>
          </div>

          {/* Tabs */}
          <div className="sticky top-16 bg-surface border-b border-border-light flex">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'edit'
                  ? 'text-primary border-primary-base'
                  : 'text-secondary border-transparent hover:text-primary'
              }`}
            >
              Active Sites ({activeSites.length})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'add'
                  ? 'text-primary border-primary-base'
                  : 'text-secondary border-transparent hover:text-primary'
              }`}
            >
              Add New
            </button>
            {archivedSites.length > 0 && (
              <button
                onClick={() => setActiveTab('archived')}
                className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'archived'
                    ? 'text-primary border-primary-base'
                    : 'text-secondary border-transparent hover:text-primary'
                }`}
              >
                Archived ({archivedSites.length})
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Add New Site Tab */}
            {activeTab === 'add' && (
              <div className="space-y-4">
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full py-3 border-2 border-dashed border-primary-base/30 rounded-lg text-primary font-medium hover:border-primary-base/50 hover:bg-primary-base/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add New Site
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 bg-elevated/30 p-4 rounded-lg border border-border-light"
                  >
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-2">Site Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Universal Studios"
                        className="w-full px-3 py-2 bg-surface border border-border-light rounded-lg text-primary placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary-base/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-2">Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g., 100 Universal City Plaza"
                        className="w-full px-3 py-2 bg-surface border border-border-light rounded-lg text-primary placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary-base/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-2">Latitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.lat}
                          onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 bg-surface border border-border-light rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-base/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-secondary mb-2">Longitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.lng}
                          onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 bg-surface border border-border-light rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-base/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-2">Geofence Radius (meters)</label>
                      <input
                        type="number"
                        value={formData.geofenceRadius}
                        onChange={(e) => setFormData({ ...formData, geofenceRadius: parseInt(e.target.value) || 200 })}
                        className="w-full px-3 py-2 bg-surface border border-border-light rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-base/50"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleAddSite}
                        className="flex-1 py-2 bg-primary-base text-white font-semibold rounded-lg hover:bg-primary-base/90 transition-colors"
                      >
                        Add Site
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false)
                          setFormData({
                            name: '',
                            address: '',
                            lat: 49.1234,
                            lng: -122.7654,
                            geofenceRadius: 200,
                          })
                        }}
                        className="flex-1 py-2 bg-surface border border-border-light text-secondary font-semibold rounded-lg hover:bg-elevated transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Edit Active Sites Tab */}
            {activeTab === 'edit' && (
              <div className="space-y-3">
                {activeSites.length === 0 ? (
                  <div className="py-8 text-center text-muted text-sm flex flex-col items-center gap-2">
                    <AlertCircle size={20} />
                    No active sites yet
                  </div>
                ) : (
                  activeSites.map((site) => (
                    <div key={site.id} className="bg-elevated/30 border border-border-light rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-secondary mb-1">Site Name</label>
                          <input
                            type="text"
                            value={site.name}
                            onChange={(e) => handleEditChange(site.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border-light rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-base/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-secondary mb-1">Address</label>
                          <input
                            type="text"
                            value={site.address}
                            onChange={(e) => handleEditChange(site.id, 'address', e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border-light rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-base/50"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border-light">
                        <button
                          onClick={() => handleArchive(site.id)}
                          className="flex-1 py-2 flex items-center justify-center gap-2 bg-warning-base/10 text-warning-base font-semibold rounded-lg hover:bg-warning-base/20 transition-colors text-xs"
                        >
                          <Archive size={14} />
                          Archive
                        </button>
                        <button
                          onClick={() => handleDelete(site.id)}
                          className="flex-1 py-2 flex items-center justify-center gap-2 bg-error-base/10 text-error-base font-semibold rounded-lg hover:bg-error-base/20 transition-colors text-xs"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Archived Sites Tab */}
            {activeTab === 'archived' && (
              <div className="space-y-3">
                {archivedSites.length === 0 ? (
                  <div className="py-8 text-center text-muted text-sm">No archived sites</div>
                ) : (
                  archivedSites.map((site) => (
                    <div key={site.id} className="bg-elevated/30 border border-border-light rounded-lg p-4 opacity-75">
                      <div className="grid grid-cols-1 gap-2 mb-3">
                        <div>
                          <p className="text-xs font-semibold text-secondary">Site Name</p>
                          <p className="text-primary font-medium text-sm">{site.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-secondary">Address</p>
                          <p className="text-primary font-medium text-sm">{site.address}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-border-light">
                        <button
                          onClick={() => handleEditChange(site.id, 'status', 'active')}
                          className="flex-1 py-2 bg-success-base/10 text-success-base font-semibold rounded-lg hover:bg-success-base/20 transition-colors text-xs"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDelete(site.id)}
                          className="flex-1 py-2 bg-error-base/10 text-error-base font-semibold rounded-lg hover:bg-error-base/20 transition-colors text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
