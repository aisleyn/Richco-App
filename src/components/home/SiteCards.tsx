import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ChevronDown, Plus } from 'lucide-react'
import { jobSites } from '../../data/mockData'

export function SiteCards() {
  const [showUpcoming, setShowUpcoming] = useState(false)
  const activeSites = jobSites.filter(s => s.status === 'active')
  const upcomingSites = jobSites.filter(s => s.status === 'upcoming')

  const SiteItem = ({ site, i }: { site: typeof jobSites[0], i: number }) => (
    <motion.div
      key={site.id}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.07 }}
      className="bg-bg-surface dark:bg-bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex items-center gap-3 active:bg-bg-elevated dark:active:bg-bg-elevated-dark transition-colors"
    >
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${site.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 dark:text-slate-100 text-sm font-medium truncate">{site.name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 truncate">
            <MapPin size={10} />{site.zone ?? site.address}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          site.status === 'active'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-amber-500/15 text-amber-400'
        }`}>
          {site.status === 'active' ? 'Active' : 'Upcoming'}
        </span>
      </div>
    </motion.div>
  )

  return (
    <div>
      {/* Active Sites Header */}
      <h3 className="text-slate-800 dark:text-slate-100 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        Active Sites
      </h3>

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
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-slate-600 dark:text-slate-400 hover:bg-bg-elevated dark:hover:bg-bg-elevated-dark transition-colors group"
          >
            <motion.div animate={{ rotate: showUpcoming ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <Plus size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-300 dark:group-hover:text-slate-400" />
            </motion.div>
            <span className="text-xs font-semibold uppercase tracking-wider">
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
    </div>
  )
}
