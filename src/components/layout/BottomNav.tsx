import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Clock, Calendar, Camera, Bell, Users, Bot, LogOut, User } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

const baseTabs = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'time', label: 'Time', Icon: Clock },
  { id: 'photos', label: 'Photos', Icon: Camera },
  { id: 'alerts', label: 'Alerts', Icon: Bell },
  { id: 'crew', label: 'Employee Hub', Icon: Users },
  { id: 'ai', label: 'AI Help', Icon: Bot },
]

const adminTabs = [
  { id: 'roster', label: 'Roster', Icon: Calendar },
]

interface Props {
  active: string
  onChange: (id: string) => void
  onLogout?: () => void
  isAdmin?: boolean
}

export function BottomNav({ active, onChange, onLogout, isAdmin = false }: Props) {
  const { unreadAlertCount, unreadMessageCount, isModalOpen, currentUserName } = useAppStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const tabs = isAdmin ? [...baseTabs, ...adminTabs] : baseTabs

  return (
    <nav className={`fixed bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:top-0 md:right-0 md:w-80 md:h-screen z-50 bg-white backdrop-blur-lg border-t border-slate-200 md:border-t-0 md:border-l safe-bottom ${isModalOpen ? 'pointer-events-none opacity-50' : ''}`}>
      <div className="flex items-stretch max-w-lg mx-auto md:flex-col md:h-full md:max-w-none md:p-4 md:gap-3">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id
          const badge = id === 'alerts' ? unreadAlertCount : id === 'crew' ? unreadMessageCount : 0
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 pt-3 gap-0.5 relative group md:flex-row md:py-3 md:px-4 md:gap-3 md:w-full md:rounded-lg md:border transition-colors ${
                isActive ? 'md:bg-green-50 md:border-green-200' : 'md:bg-white md:border-slate-200 md:hover:bg-slate-50'
              } md:border`}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-green-600' : 'text-slate-500 group-active:text-slate-300 transition-colors'}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-md min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-sm font-medium md:flex-1 md:text-left ${isActive ? 'text-green-600' : 'text-slate-500'}`}>
                {label}
              </span>
            </button>
          )
        })}

        {/* Profile Button - Desktop only */}
        <div className="hidden md:block md:mt-auto md:pt-3 md:border-t md:border-slate-200 relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {currentUserName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="flex-1 text-left text-sm font-medium text-slate-900 truncate">
              {currentUserName || 'User'}
            </span>
          </button>

          {/* Profile Dropdown */}
          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute bottom-full mb-2 right-0 left-0 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden"
              >
                <button
                  onClick={() => {
                    onChange('profile')
                    setShowProfileMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <User size={16} />
                  View Profile
                </button>
                <button
                  onClick={() => {
                    onLogout?.()
                    setShowProfileMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-200"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  )
}
