import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './components/layout/BottomNav'
import { LoginScreen } from './screens/LoginScreen'
import { HomeScreen } from './screens/HomeScreen'
import { TimesheetScreen } from './screens/TimesheetScreen'
import { PhotosScreen } from './screens/PhotosScreen'
import { AlertsScreen } from './screens/AlertsScreen'
import { CrewScreen } from './screens/CrewScreen'
import { AdminCrewScreen } from './screens/AdminCrewScreen'
import { AIHelpScreen } from './screens/AIHelpScreen'
import { getCurrentUser, logout, isUserAdmin } from './services/supabaseAuth'
import { useAppStore } from './store/appStore'
import { useDarkMode } from './hooks/useDarkMode'
import { initializeCrew } from './services/crew'
import { syncEmployeeTimesheets } from './services/supabase'

type ScreenProps = { onNavigate: (s: string) => void }

export default function App() {
  const [active, setActive] = useState('home')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { initializeUser } = useAppStore()
  useDarkMode()

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('[App] Checking for authenticated user...')
        const user = await getCurrentUser()
        if (user) {
          console.log('[App] User found:', user.email)
          initializeUser(user.name, user.email, user.id)

          // Check if user is admin
          const adminStatus = user.role === 'admin'
          setIsAdmin(adminStatus)
          console.log('[App] User is admin:', adminStatus)

          // Sync timesheets
          await syncEmployeeTimesheets(user.id, user.email)

          // Initialize crew system
          initializeCrew()

          setAuthenticated(true)
        } else {
          console.log('[App] No authenticated user found')
        }
      } catch (err) {
        console.error('[App] Error checking user:', err)
      } finally {
        setChecking(false)
      }
    }
    checkUser()
  }, [initializeUser])

  if (checking) {
    return (
      <div className="min-h-screen bg-bg-base dark:bg-bg-base-dark flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-12 h-12 rounded-full border-2 border-blue-600 border-t-transparent"
        />
      </div>
    )
  }

  if (!authenticated) {
    return <LoginScreen onLoginSuccess={() => setAuthenticated(true)} />
  }

  const renderScreen = () => {
    switch (active) {
      case 'home':   return <HomeScreen onNavigate={setActive} />
      case 'time':   return <TimesheetScreen onNavigate={setActive} />
      case 'photos': return <PhotosScreen onNavigate={setActive} />
      case 'alerts': return <AlertsScreen onNavigate={setActive} />
      case 'crew':   return isAdmin ? <AdminCrewScreen onNavigate={setActive} /> : <CrewScreen onNavigate={setActive} />
      case 'ai':     return <AIHelpScreen onNavigate={setActive} />
      default:       return <HomeScreen onNavigate={setActive} />
    }
  }

  async function handleLogout() {
    await logout()
    setAuthenticated(false)
    setActive('home')
  }

  return (
    <div className="relative min-h-screen w-full bg-bg-base dark:bg-bg-base-dark">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
      <BottomNav active={active} onChange={setActive} onLogout={handleLogout} />
    </div>
  )
}
