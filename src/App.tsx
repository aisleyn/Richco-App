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
import { getCurrentUser } from './services/auth'
import { useAppStore } from './store/appStore'
import { useDarkMode } from './hooks/useDarkMode'

type ScreenProps = { onNavigate: (s: string) => void }

export default function App() {
  const [active, setActive] = useState('home')
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const { initializeUser } = useAppStore()
  useDarkMode() // Initialize dark mode on app load

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const user = await getCurrentUser()
      if (user) {
        initializeUser(user.displayName, user.mail, user.id)
        setAuthenticated(true)
      }
      setChecking(false)
    }
    checkUser()
  }, [initializeUser])

  if (checking) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-12 h-12 rounded-full border-2 border-brand-amber border-t-transparent"
        />
      </div>
    )
  }

  if (!authenticated) {
    return <LoginScreen onLoginSuccess={() => setAuthenticated(true)} />
  }

  const renderScreen = () => {
    switch (active) {
      case 'home':    return <HomeScreen onNavigate={setActive} />
      case 'time':    return <TimesheetScreen onNavigate={setActive} />
      case 'photos':  return <PhotosScreen onNavigate={setActive} />
      case 'alerts':  return <AlertsScreen onNavigate={setActive} />
      case 'crew':    return <CrewScreen onNavigate={setActive} />
      case 'ai':      return <AIHelpScreen onNavigate={setActive} />
      default:        return <HomeScreen onNavigate={setActive} />
    }
  }

  return (
    <div className="max-w-lg mx-auto relative min-h-screen bg-bg-base">
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
