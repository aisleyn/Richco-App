import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Bell, MessageSquare, X, AlertCircle } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { WeatherCard } from '../components/home/WeatherCard'
import { ClockInCard } from '../components/home/ClockInCard'
import { SiteCards } from '../components/home/SiteCards'
import { ClockOutModal } from '../components/timesheet/ClockOutModal'
import { ThemeToggle } from '../components/ThemeToggle'
import { useGreeting } from '../hooks/useGreeting'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAppStore } from '../store/appStore'
import { getProjects, type Project } from '../services/supabase'
import { isUserAdmin, getAllCrew } from '../services/crew'

interface Props {
  onNavigate: (screen: string) => void
}

export function HomeScreen({ onNavigate }: Props) {
  const { currentUserName, currentUserEmail } = useAppStore()
  const firstName = currentUserName?.split(' ')[0] || 'there'
  const greeting = useGreeting(firstName)
  const { clockedIn, clockIn, unreadAlertCount, unreadMessageCount } = useAppStore()
  const { requestLocation, isLoading: isGeoLoading, error: geoError } = useGeolocation()
  const [showClockOut, setShowClockOut] = useState(false)
  const [showSitePicker, setShowSitePicker] = useState(false)
  const [sites, setSites] = useState<Project[]>([])
  const [selectedSite, setSelectedSite] = useState<Project | null>(null)
  const [isLoadingSites, setIsLoadingSites] = useState(false)
  const [isClockingIn, setIsClockingIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCEO, setIsCEO] = useState(false)
  const today = new Date()

  useEffect(() => {
    async function loadSites() {
      setIsLoadingSites(true)
      try {
        const fetchedProjects = await getProjects('active')
        setSites(fetchedProjects)
      } catch (err) {
        console.error('Failed to load projects:', err)
        setSites([])
      }
      setIsLoadingSites(false)
    }
    loadSites()
  }, [])

  useEffect(() => {
    const loadUserStatus = async () => {
      const admin = await isUserAdmin(currentUserEmail)
      setIsAdmin(admin)
      const crew = await getAllCrew()
      const userIsLeadership = crew.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase())?.role === 'leadership'
      setIsCEO(userIsLeadership ?? false)
    }
    loadUserStatus()
  }, [currentUserEmail])

  function handleClockIn(isOvernight: boolean) {
    setShowSitePicker(true)
  }

  async function confirmClockIn(isOvernight: boolean) {
    if (!selectedSite) return
    setIsClockingIn(true)

    // Request real GPS coordinates
    console.log('[HomeScreen] Requesting GPS for clock in...')
    const location = await requestLocation()
    console.log('[HomeScreen] GPS result:', location)

    if (!location) {
      console.warn('[HomeScreen] GPS failed, using site location only')
    }

    // Use real GPS if available, otherwise use site location
    const gpsData = location || {
      lat: parseFloat(selectedSite.location?.split(',')[0] || '49.1234'),
      lng: parseFloat(selectedSite.location?.split(',')[1] || '-122.7654'),
      address: selectedSite.location || selectedSite.client || 'Site Location'
    }

    console.log('[HomeScreen] Clocking in with GPS data:', gpsData)
    clockIn(selectedSite.id, selectedSite.name, isOvernight, gpsData)
    setShowSitePicker(false)
    setSelectedSite(null)
    setIsClockingIn(false)
  }

  // Supervisor stat bar
  const isSupervisor = isAdmin || isCEO

  return (
    <AppLayout onNavigate={onNavigate}>
      {/* Header */}
      <div className="pt-6 pb-2 flex items-start justify-between">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-slate-400 dark:text-slate-500 text-xs md:text-sm">{format(today, 'EEEE, MMMM d')}</p>
          <h1 className="text-slate-900 dark:text-slate-100 text-xl md:text-2xl font-bold mt-0.5">{greeting}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-base mt-1">Week {format(today, 'w')} · {format(today, 'yyyy')}</p>
        </motion.div>
        <div className="flex items-center gap-2 pt-0">
          <ThemeToggle />
          <button onClick={() => onNavigate('crew')} className="relative">
            <MessageSquare size={22} className="text-slate-400 dark:text-slate-500" />
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-md w-4 h-4 flex items-center justify-center">
                {unreadMessageCount}
              </span>
            )}
          </button>
          <button onClick={() => onNavigate('alerts')} className="relative">
            <Bell size={22} className="text-slate-400 dark:text-slate-500" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-md w-4 h-4 flex items-center justify-center">
                {unreadAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>

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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSitePicker(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-4 max-h-[90vh] overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 dark:text-white font-bold">Select Project</h2>
              <button
                onClick={() => setShowSitePicker(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center"
              >
                <X size={16} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {isLoadingSites ? (
              <p className="text-slate-400 text-center py-8">Loading projects...</p>
            ) : (
              <div className="space-y-2">
                {sites.map((site) => (
                  <motion.button
                    key={site.id}
                    onClick={() => setSelectedSite(site)}
                    className={`w-full p-4 rounded-xl text-left transition-colors ${
                      selectedSite?.id === site.id
                        ? 'bg-green-100 dark:bg-green-900/30 border border-green-500 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <p className="font-semibold">{site.name}</p>
                    {site.client && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{site.client}</p>
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {geoError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{geoError}</p>
              </div>
            )}
            <button
              onClick={() => confirmClockIn(false)}
              disabled={!selectedSite || isLoadingSites || isClockingIn}
              className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClockingIn ? 'Getting GPS...' : 'Clock In'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AppLayout>
  )
}
