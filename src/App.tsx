import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './components/layout/BottomNav'
import { LoginScreen } from './screens/LoginScreen'
import { HomeScreen } from './screens/HomeScreen'
import { TimesheetScreen } from './screens/TimesheetScreen'
import { PhotosScreen } from './screens/PhotosScreen'
import { AlertsScreen } from './screens/AlertsScreen'
import { CrewScreen } from './screens/CrewScreen'
import { AIHelpScreen } from './screens/AIHelpScreen'
import { RegistrationModal } from './components/crew/RegistrationModal'
import { getCurrentUser } from './services/auth'
import { useAppStore } from './store/appStore'
import { useDarkMode } from './hooks/useDarkMode'
import { initializeCrew, clearAllCrew, hasUserCompletedRegistration, setAdminStatus } from './services/crew'
import { syncEmployeeTimesheets } from './services/supabase'

type ScreenProps = { onNavigate: (s: string) => void }

export default function App() {
  const [active, setActive] = useState('home')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showRegistration, setShowRegistration] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ mail: string; displayName: string } | null>(null)
  const { initializeUser } = useAppStore()
  useDarkMode() // Initialize dark mode on app load

  // Check if user is already logged in - ALWAYS fetch fresh from Azure AD
  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('[App] Checking for authenticated user...')
        const user = await getCurrentUser()
        if (user) {
          console.log('[App] User found:', user.displayName, '- initializing store')
          initializeUser(user.displayName, user.mail, user.id)
          // Sync user's timesheets from Supabase to device
          await syncEmployeeTimesheets(user.id, user.mail)
          // Initialize crew system
          initializeCrew()

          // Check if user has completed registration
          const hasRegistered = await hasUserCompletedRegistration(user.mail)
          if (!hasRegistered) {
            console.log('[App] New user - showing registration modal')
            setCurrentUser(user)
            setShowRegistration(true)
          } else {
            console.log('[App] Returning user - proceeding to app')
            await setAdminStatus(user.mail, true) // Keep admin check for existing users
            setAuthenticated(true)
          }
        } else {
          console.log('[App] No authenticated user found - showing login screen')
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
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-12 h-12 rounded-full border-2 border-blue-600 border-t-transparent"
        />
      </div>
    )
  }

  if (showRegistration && currentUser) {
    return (
      <RegistrationModal
        email={currentUser.mail}
        displayName={currentUser.displayName}
        onComplete={async () => {
          setShowRegistration(false)
          setCurrentUser(null)
          await setAdminStatus(currentUser.mail, true)
          setAuthenticated(true)
        }}
      />
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
      case 'crew':   return <CrewScreen onNavigate={setActive} />
      case 'ai':     return <AIHelpScreen onNavigate={setActive} />
      default:       return <HomeScreen onNavigate={setActive} />
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-bg-base">
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
      <BottomNav active={active} onChange={setActive} />
    </div>
  )
}
