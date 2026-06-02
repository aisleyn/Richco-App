import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, ChevronDown } from 'lucide-react'
import { jobSites } from '../../data/mockData'

export function SiteCards() {
  const [expanded, setExpanded] = useState(true)
  const activeSites = jobSites.filter(s => s.status !== 'completed')

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h3 className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Sites & Shifts</h3>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-300 dark:group-hover:text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 overflow-hidden"
          >
            {activeSites.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-xs">No active sites</p>
            ) : (
              activeSites.map((site, i) => (
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
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
