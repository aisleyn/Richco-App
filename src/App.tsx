import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './components/layout/BottomNav'
import { NotificationsPanel } from './components/layout/NotificationsPanel'
import { LoginScreen } from './screens/LoginScreen'
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen'
import { HomeScreen } from './screens/HomeScreen'
import { TimesheetScreen } from './screens/TimesheetScreen'
import { PhotosScreen } from './screens/PhotosScreen'
import { AlertsScreen } from './screens/AlertsScreen'
import { CrewScreen } from './screens/CrewScreen'
import { AdminCrewScreen } from './screens/AdminCrewScreen'
import { AIHelpScreen } from './screens/AIHelpScreen'
import { ShiftRosterScreen } from './screens/ShiftRosterScreen'
import { NotificationDetailScreen } from './screens/NotificationDetailScreen'
import { getCurrentUser, logout, isUserAdmin, supabase } from './services/supabaseAuth'
import { useAppStore } from './store/appStore'
import { useDarkMode } from './hooks/useDarkMode'
import { initializeCrew } from './services/crew'
import { syncEmployeeTimesheets } from './services/supabase'
import { SetPasswordModal } from './components/crew/SetPasswordModal'
import type { Notification } from './services/notificationService'

type ScreenProps = { onNavigate: (s: string) => void }

export default function App() {
  const [active, setActive] = useState('home')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const { initializeUser } = useAppStore()
  useDarkMode()

  // Handle email confirmation from Supabase
  useEffect(() => {
    const handleAuthCallback = async () => {
      const fullHash = window.location.hash
      console.log('[App] Full hash:', fullHash)

      const params = new URLSearchParams(fullHash.slice(1))
      const token = params.get('token_hash') || params.get('token')
      const type = params.get('type')

      console.log('[App] Parsed params - token:', token, 'type:', type)

      if (token && (type === 'signup' || type === 'recovery')) {
        try {
          console.log('[App] Processing email confirmation token...')
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: type as 'signup' | 'recovery',
          })

          if (error) {
            console.error('[App] Email confirmation failed:', error.message)
            return
          }

          if (data.user) {
            console.log('[App] Email confirmed for:', data.user.email, 'showing password setup modal...')
            setPendingEmail(data.user.email || null)
            setShowPasswordModal(true)
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        } catch (err) {
          console.error('[App] Error handling auth callback:', err)
        }
      } else {
        console.log('[App] No auth token found in hash')
      }
    }

    handleAuthCallback()
  }, [])

  // Check if user is already logged in (silent auto-login on startup)
  useEffect(() => {
    const checkUser = async () => {
      // Skip auth check if we're showing password modal
      if (showPasswordModal) {
        console.log('[App] Skipping user check - showing password modal')
        setChecking(false)
        return
      }

      try {
        console.log('[App] Checking for authenticated user...')
        const user = await getCurrentUser()
        if (user) {
          console.log('[App] ✅ Silent auto-login: restoring session for', user.email)
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
          console.log('[App] No authenticated user found - showing login screen')
        }
      } catch (err) {
        console.error('[App] Error checking user:', err)
      } finally {
        setChecking(false)
      }
    }
    checkUser()
  }, [initializeUser, showPasswordModal])

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

  if (showPasswordModal && pendingEmail) {
    return (
      <SetPasswordModal
        email={pendingEmail}
        onComplete={() => {
          setShowPasswordModal(false)
          setPendingEmail(null)
          setAuthenticated(true)
        }}
      />
    )
  }

  if (!authenticated) {
    if (showForgotPassword) {
      return <ForgotPasswordScreen onBackToLogin={() => setShowForgotPassword(false)} />
    }
    return (
      <LoginScreen
        onLoginSuccess={() => setAuthenticated(true)}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
    )
  }

  const renderScreen = () => {
    switch (active) {
      case 'home':   return <HomeScreen onNavigate={setActive} />
      case 'time':   return <TimesheetScreen onNavigate={setActive} />
      case 'photos': return <PhotosScreen onNavigate={setActive} />
      case 'alerts': return <AlertsScreen onNavigate={setActive} />
      case 'roster': return isAdmin ? <ShiftRosterScreen /> : <HomeScreen onNavigate={setActive} />
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

  // Handle nav changes - clear notification detail when navigating
  function handleNavChange(screenId: string) {
    setActive(screenId)
    setSelectedNotification(null)
  }

  // If a notification is selected, show its detail screen
  if (selectedNotification) {
    return (
      <div className="relative min-h-screen w-full bg-bg-base dark:bg-bg-base-dark flex flex-col md:flex-row">
        <NotificationsPanel onNotificationClick={setSelectedNotification} />
        <div className="flex-1 flex flex-col md:pr-20">
          <NotificationDetailScreen
            notification={selectedNotification}
            onBack={() => setSelectedNotification(null)}
          />
          <BottomNav active={active} onChange={handleNavChange} isAdmin={isAdmin} />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full bg-bg-base dark:bg-bg-base-dark flex flex-col md:flex-row">
      {/* Notifications Panel - Desktop only */}
      <NotificationsPanel onNotificationClick={setSelectedNotification} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pr-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex-1"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>

        {/* Right Navigation - Desktop only */}
        <BottomNav active={active} onChange={setActive} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
