import { motion } from 'framer-motion'
import { MapPin, Clock } from 'lucide-react'
import { jobSites, tomorrowShift } from '../../data/mockData'

export function SiteCards() {
  return (
    <div>
      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Active Sites & Shifts</h3>
      <div className="space-y-2">
        {jobSites.filter(s => s.status !== 'completed').map((site, i) => (
          <motion.div
            key={site.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-bg-surface rounded-xl border border-slate-200 p-3.5 flex items-center gap-3 active:bg-bg-elevated transition-colors"
          >
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${site.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{site.name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-slate-500 text-xs flex items-center gap-1 truncate">
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
        ))}

        {/* Tomorrow's shift */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.21 }}
          className="bg-bg-surface rounded-xl border border-slate-200 p-3.5 flex items-center gap-3"
        >
          <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-600" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-300 text-sm font-medium truncate">{tomorrowShift.siteName}</p>
            <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
              <Clock size={10} /> Tomorrow · {tomorrowShift.startTime} – {tomorrowShift.endTime}
            </p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 shrink-0">
            Tomorrow
          </span>
        </motion.div>
      </div>
    </div>
  )
}
