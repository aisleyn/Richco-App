import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LogOut, User } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { logout } from '../../services/supabaseAuth'

interface Props {
  children: ReactNode
  noPad?: boolean
  onLogout?: () => void
}

export function AppLayout({ children, noPad, onLogout }: Props) {
  const [showProfile, setShowProfile] = useState(false)
  const { currentUserName, currentUserEmail } = useAppStore()

  const handleLogout = async () => {
    await logout()
    onLogout?.()
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-y-scroll">
      {/* User Profile Header - Top Right */}
      <div className="fixed top-4 right-4 z-40 md:z-10">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
            {currentUserName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
              {currentUserName || 'User'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
              {currentUserEmail || 'user@example.com'}
            </p>
          </div>
        </button>

        {/* Profile Dropdown */}
        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
            >
              {/* Profile Section */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">
                    {currentUserName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 dark:text-slate-100 font-semibold truncate">
                      {currentUserName || 'User'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs truncate">
                      {currentUserEmail || 'user@example.com'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setShowProfile(false)
                    // Could navigate to profile settings here
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <User size={16} />
                  View Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className={`mx-auto pb-20 md:pb-0 md:ml-80 md:mr-80 ${noPad ? '' : 'px-4 md:px-6'} overflow-x-hidden`}>
        {children}
      </div>
    </div>
  )
}
