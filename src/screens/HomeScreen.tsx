import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Bell, MessageSquare, X } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { WeatherCard } from '../components/home/WeatherCard'
import { ClockInCard } from '../components/home/ClockInCard'
import { SiteCards } from '../components/home/SiteCards'
import { AlertsStrip } from '../components/home/AlertsStrip'
import { ClockOutModal } from '../components/timesheet/ClockOutModal'
import { useGreeting } from '../hooks/useGreeting'
import { currentUser } from '../data/mockData'
import { useAppStore } from '../store/appStore'
import { fetchSites, type DataverseSite } from '../services/dataverse'
import type { Alert } from '../types'

interface Props {
  onNavigate: (screen: string) => void
}

export function HomeScreen({ onNavigate }: Props) {
  const greeting = useGreeting(currentUser.firstName)
  const { clockedIn, clockIn, unreadAlertCount, unreadMessageCount } = useAppStore()
  const [showClockOut, setShowClockOut] = useState(false)
  const [showSitePicker, setShowSitePicker] = useState(false)
  const [sites, setSites] = useState<DataverseSite[]>([])
  const [selectedSite, setSelectedSite] = useState<DataverseSite | null>(null)
  const [isLoadingSites, setIsLoadingSites] = useState(false)
  const today = new Date()

  useEffect(() => {
    async function loadSites() {
      setIsLoadingSites(true)
      const fetchedSites = await fetchSites()
      setSites(fetchedSites.length > 0 ? fetchedSites : [{ craa5_projectid: 'site1', craa5_projectname: 'Grandview Heights Phase 3', craa5_client: '18955 Fraser Hwy, Surrey, BC' }])
      setIsLoadingSites(false)
    }
    loadSites()
  }, [])

  function handleClockIn(isOvernight: boolean) {
    setShowSitePicker(true)
  }

  function confirmClockIn(isOvernight: boolean) {
    if (!selectedSite) return
    clockIn(selectedSite.craa5_projectid, selectedSite.craa5_projectname, isOvernight, { lat: 49.1234, lng: -122.7654, address: selectedSite.craa5_client || '18955 Fraser Hwy, Surrey, BC' })
    setShowSitePicker(false)
    setSelectedSite(null)
  }

  // Supervisor stat bar
  const isSupervisor = currentUser.role === 'supervisor' || currentUser.role === 'ceo'

  return (
    <AppLayout>
      {/* Header */}
      <div className="pt-14 pb-2 flex items-start justify-between">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-slate-400 text-sm">{format(today, 'EEEE, MMMM d')}</p>
          <h1 className="text-slate-900 text-2xl font-bold mt-0.5">{greeting}</h1>
          <p className="text-slate-500 text-xs mt-1">Week {format(today, 'w')} · {format(today, 'yyyy')}</p>
        </motion.div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={() => onNavigate('crew')} className="relative">
            <MessageSquare size={22} className="text-slate-400" />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadMessageCount}
              </span>
            )}
          </button>
          <button onClick={() => onNavigate('alerts')} className="relative">
            <Bell size={22} className="text-slate-400" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Supervisor stat bar */}
      {isSupervisor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-4 grid grid-cols-3 gap-2"
        >
          {[
            { label: 'On Site', value: '6', color: 'text-emerald-400' },
            { label: 'Flagged', value: '2', color: 'text-red-400' },
            { label: 'Pending', value: '4', color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-bg-surface rounded-xl py-3 text-center border border-slate-200">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      )}

      <div className="mt-5 space-y-5">
        {/* Weather */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <WeatherCard />
        </motion.div>

        {/* Clock in */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ClockInCard
            onClockIn={handleClockIn}
            onClockOut={() => setShowClockOut(true)}
            onNavigateTime={() => onNavigate('time')}
            isOvernightShift={false}
          />
        </motion.div>

        {/* Sites */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <SiteCards />
        </motion.div>

        {/* Alerts strip */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <AlertsStrip
            onSeeAll={() => onNavigate('alerts')}
            onTapAlert={(_a: Alert) => onNavigate('alerts')}
          />
        </motion.div>

        {/* Messages bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <button
            onClick={() => onNavigate('crew')}
            className="w-full bg-bg-surface rounded-2xl border border-slate-200 p-4 flex items-center gap-3 active:bg-bg-elevated transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-brand-amber/15 flex items-center justify-center shrink-0">
              <MessageSquare size={16} className="text-brand-amber" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-slate-400 text-xs">Tyler Nash</p>
              <p className="text-slate-800 text-sm truncate">Roger that, on my way to Zone A now</p>
            </div>
            {unreadMessageCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                {unreadMessageCount}
              </span>
            )}
          </button>
        </motion.div>
      </div>

      {/* Clock out modal */}
      {showClockOut && (
        <ClockOutModal
          onClose={() => setShowClockOut(false)}
          onConfirm={() => setShowClockOut(false)}
        />
      )}

      {/* Site picker modal */}
      {showSitePicker && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowSitePicker(false)}
        >
          <motion.div
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            className="w-full bg-bg-elevated rounded-t-3xl p-4 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 text-lg font-bold">Select Job Site</h2>
              <button
                onClick={() => setShowSitePicker(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {isLoadingSites ? (
              <p className="text-slate-400 text-center py-8">Loading sites...</p>
            ) : (
              <div className="space-y-2">
                {sites.map((site) => (
                  <motion.button
                    key={site.craa5_projectid}
                    onClick={() => setSelectedSite(site)}
                    className={`w-full p-4 rounded-xl text-left transition-colors ${
                      selectedSite?.craa5_projectid === site.craa5_projectid
                        ? 'bg-brand-green/20 border border-brand-green text-white'
                        : 'bg-bg-surface border border-slate-200 text-slate-300 hover:border-white/10'
                    }`}
                  >
                    <p className="font-semibold">{site.craa5_projectname}</p>
                    {site.craa5_client && (
                      <p className="text-xs text-slate-500 mt-1">{site.craa5_client}</p>
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            <button
              onClick={() => confirmClockIn(false)}
              disabled={!selectedSite || isLoadingSites}
              className="w-full mt-6 py-3 bg-brand-green text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clock In
            </button>
          </motion.div>
        </motion.div>
      )}
    </AppLayout>
  )
}
