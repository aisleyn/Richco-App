import { useState } from 'react'
import { motion } from 'framer-motion'
import { Home, Clock, Calendar, Camera, Bell, Users, Bot, LogOut, Settings } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

const tabs = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'time', label: 'Time', Icon: Clock },
  { id: 'photos', label: 'Photos', Icon: Camera },
  { id: 'alerts', label: 'Alerts', Icon: Bell },
  { id: 'crew', label: 'Crew', Icon: Users },
  { id: 'ai', label: 'AI Help', Icon: Bot },
]

interface Props {
  active: string
  onChange: (id: string) => void
  onLogout?: () => void
}

export function BottomNav({ active, onChange, onLogout }: Props) {
  const { unreadAlertCount, unreadMessageCount, currentUserEmail } = useAppStore()
  const [showMenu, setShowMenu] = useState(false)

  const handleSwitchCrew = () => {
    setShowMenu(false)
    if (onLogout) onLogout()
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:bottom-auto md:right-0 md:left-auto md:top-0 md:w-20 md:h-screen z-50 bg-bg-surface/95 dark:bg-bg-surface-dark/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 md:border-t-0 md:border-l safe-bottom md:safe-left">
      <div className="flex items-stretch max-w-lg mx-auto md:flex-col md:h-full md:max-w-none">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id
          const badge = id === 'alerts' ? unreadAlertCount : id === 'crew' ? unreadMessageCount : 0
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex flex-col items-center justify-center py-2 pt-3 gap-0.5 relative group md:flex-col md:py-4 md:pt-4 md:flex-auto"
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400 group-active:text-slate-300 dark:group-active:text-slate-500 transition-colors'}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-medium ${isActive ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'}`}>
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 md:bottom-auto md:right-0.5 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 w-1 h-1 rounded-full bg-blue-600"
                />
              )}
            </button>
          )
        })}

        {/* Settings Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex-1 flex flex-col items-center justify-center py-2 pt-3 gap-0.5 relative group md:flex-col md:py-4 md:pt-4 md:flex-auto"
          >
            <Settings
              size={22}
              strokeWidth={1.8}
              className="text-slate-500 dark:text-slate-400 group-active:text-slate-300 dark:group-active:text-slate-500 transition-colors"
            />
            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Menu</span>
          </button>

          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute bottom-full right-0 md:bottom-auto md:right-auto md:top-full md:left-0 mb-2 md:mb-0 md:mt-2 bg-bg-base dark:bg-bg-base-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-48 overflow-hidden z-50"
            >
              <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400">Logged in as</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{currentUserEmail}</p>
              </div>
              <button
                onClick={handleSwitchCrew}
                className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
              >
                <LogOut size={16} />
                Switch Crew Member
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </nav>
  )
}
