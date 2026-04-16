import { motion } from 'framer-motion'
import { Home, Clock, Camera, Bell, Users, Bot } from 'lucide-react'
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
}

export function BottomNav({ active, onChange }: Props) {
  const { unreadAlertCount, unreadMessageCount } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface/95 backdrop-blur-lg border-t border-slate-200 safe-bottom">
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id
          const badge = id === 'alerts' ? unreadAlertCount : id === 'crew' ? unreadMessageCount : 0
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex flex-col items-center justify-center py-2 pt-3 gap-0.5 relative group"
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-brand-amber' : 'text-slate-500 group-active:text-slate-300 transition-colors'}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-medium ${isActive ? 'text-brand-amber' : 'text-slate-500'}`}>
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-amber"
                />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
