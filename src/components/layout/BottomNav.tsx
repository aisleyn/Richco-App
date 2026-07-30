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
  const { unreadAlertCount, unreadMessageCount, isModalOpen } = useAppStore()

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
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
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
      </div>
    </nav>
  )
}
