import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { Bell, MessageSquare } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { WeatherCard } from '../components/home/WeatherCard'
import { ClockInCard } from '../components/home/ClockInCard'
import { SiteCards } from '../components/home/SiteCards'
import { ClockOutModal } from '../components/timesheet/ClockOutModal'
import { ThemeToggle } from '../components/ThemeToggle'
import { useGreeting } from '../hooks/useGreeting'
import { useGeolocation } from '../hooks/useGeolocation'
import { useAppStore } from '../store/appStore'
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
  const [isClockingIn, setIsClockingIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCEO, setIsCEO] = useState(false)
  const today = new Date()


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

  async function handleClockIn(isOvernight: boolean) {
    setIsClockingIn(true)

    try {
      // Request real GPS coordinates
      console.log('[HomeScreen] Requesting GPS for clock in...')
      const location = await requestLocation()
      console.log('[HomeScreen] GPS result:', location)

      if (!location) {
        console.warn('[HomeScreen] GPS failed, will use default location')
      }

      // Use real GPS if available, otherwise use default
      const gpsData = location || {
        lat: 0,
        lng: 0,
        address: 'GPS Location'
      }

      console.log('[HomeScreen] Clocking in with GPS data:', gpsData)
      // Clock in with a generic site ID - GPS location is what matters
      clockIn('job-site', 'Job Site', isOvernight, gpsData)
    } catch (err) {
      console.error('[HomeScreen] Error during clock in:', err)
    } finally {
      setIsClockingIn(false)
    }
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

    </AppLayout>
  )
}
