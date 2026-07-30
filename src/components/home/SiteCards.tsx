import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ChevronDown, Plus, Settings } from 'lucide-react'
import { jobSites } from '../../data/mockData'
import { EditSitesModal } from './EditSitesModal'
import type { JobSite } from '../../types'

export function SiteCards() {
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [sites, setSites] = useState<JobSite[]>(jobSites)

  const activeSites = sites.filter(s => s.status === 'active')
  const upcomingSites = sites.filter(s => s.status === 'upcoming')

  const handleAddSite = (newSite: Omit<JobSite, 'id'>) => {
    const id = `site-${Date.now()}`
    setSites([...sites, { ...newSite, id }])
  }

  const handleEditSite = (id: string, updates: Partial<JobSite>) => {
    setSites(sites.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const handleDeleteSite = (id: string) => {
    setSites(sites.filter(s => s.id !== id))
  }

  const handleArchiveSite = (id: string) => {
    setSites(sites.map(s => s.id === id ? { ...s, status: 'archived' } : s))
  }

  const SiteItem = ({ site, i }: { site: JobSite, i: number }) => (
    <motion.div
      key={site.id}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.07 }}
      className="bg-surface border border-border-light rounded-lg p-3.5 flex items-center gap-3 active:bg-elevated transition-colors"
    >
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${site.status === 'active' ? 'bg-success-base' : 'bg-warning-base'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-primary font-semibold truncate text-sm">{site.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <MapPin size={10} className="text-secondary shrink-0" />
          <span className="text-secondary text-xs truncate">{site.zone ?? site.address}</span>
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
          site.status === 'active'
            ? 'bg-success-base/15 text-success-medium'
            : 'bg-warning-base/15 text-warning-darker'
        }`}>
          {site.status === 'active' ? 'Active' : 'Upcoming'}
        </span>
      </div>
    </motion.div>
  )

  return (
    <div>
      {/* Active Sites Header with Edit Button */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success-base" />
          Active Sites
        </h3>
        <button
          onClick={() => setShowEditModal(true)}
          className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:bg-slate-900 dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 active:scale-95"
        >
          <Settings size={12} />
          Edit Sites
        </button>
      </div>

      {/* Active Sites */}
      <div className="space-y-2 mb-4">
        {activeSites.length === 0 ? (
          <p className="text-slate-400 dark:text-slate-500 text-xs">No active sites</p>
        ) : (
          activeSites.map((site, i) => (
            <SiteItem key={site.id} site={site} i={i} />
          ))
        )}
      </div>

      {/* Upcoming Sites Expandable Section */}
      {upcomingSites.length > 0 && (
        <motion.div>
          <button
            onClick={() => setShowUpcoming(!showUpcoming)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-secondary hover:bg-elevated transition-colors group"
          >
            <motion.div animate={{ rotate: showUpcoming ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <Plus size={16} className="text-secondary group-hover:text-primary" />
            </motion.div>
            <span className="text-xs font-bold uppercase tracking-widest">
              Show Upcoming Sites ({upcomingSites.length})
            </span>
          </button>

          <AnimatePresence>
            {showUpcoming && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 overflow-hidden"
              >
                {upcomingSites.map((site, i) => (
                  <SiteItem key={site.id} site={site} i={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Edit Sites Modal */}
      <EditSitesModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        sites={sites}
        onAddSite={handleAddSite}
        onEditSite={handleEditSite}
        onDeleteSite={handleDeleteSite}
        onArchiveSite={handleArchiveSite}
      />
    </div>
  )
}
