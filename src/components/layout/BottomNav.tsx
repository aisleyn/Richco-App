import { motion } from 'framer-motion'
import { Home, Clock, Calendar, Camera, Bell, Users, Bot } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

const baseTabs = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'time', label: 'Time', Icon: Clock },
  { id: 'photos', label: 'Photos', Icon: Camera },
  { id: 'alerts', label: 'Alerts', Icon: Bell },
  { id: 'crew', label: 'Crew', Icon: Users },
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

export function BottomNav({ active, onChange, isAdmin = false }: Props) {
  const { unreadAlertCount, unreadMessageCount } = useAppStore()

  const tabs = isAdmin ? [...baseTabs, ...adminTabs] : baseTabs

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
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 md:bottom-1 md:right-1 md:left-auto md:top-auto md:translate-x-0 w-1 h-1 rounded-full bg-blue-600"
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
