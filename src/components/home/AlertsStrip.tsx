import { motion } from 'framer-motion'
import { AlertTriangle, Info, Cloud, CalendarDays } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { formatDistanceToNow } from 'date-fns'
import type { Alert } from '../../types'

const typeConfig = {
  urgent: { color: 'border-l-red-500', dot: 'bg-red-500', icon: AlertTriangle, iconColor: 'text-red-400' },
  ceo: { color: 'border-l-amber-500', dot: 'bg-amber-500', icon: AlertTriangle, iconColor: 'text-amber-400' },
  weather: { color: 'border-l-blue-500', dot: 'bg-blue-500', icon: Cloud, iconColor: 'text-blue-400' },
  general: { color: 'border-l-slate-500', dot: 'bg-slate-500', icon: Info, iconColor: 'text-slate-400' },
  schedule: { color: 'border-l-purple-500', dot: 'bg-purple-500', icon: CalendarDays, iconColor: 'text-purple-400' },
  vendor: { color: 'border-l-teal-500', dot: 'bg-teal-500', icon: Info, iconColor: 'text-teal-400' },
  timesheet: { color: 'border-l-orange-500', dot: 'bg-orange-500', icon: AlertTriangle, iconColor: 'text-orange-400' },
  certification: { color: 'border-l-pink-500', dot: 'bg-pink-500', icon: AlertTriangle, iconColor: 'text-pink-400' },
}

interface Props {
  onSeeAll: () => void
  onTapAlert: (a: Alert) => void
}

export function AlertsStrip({ onSeeAll, onTapAlert }: Props) {
  const { alerts, markAlertRead } = useAppStore()
  const recent = alerts.slice(0, 3)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Recent Alerts</h3>
        <button onClick={onSeeAll} className="text-brand-amber text-xs font-medium">See All</button>
      </div>
      <div className="space-y-2">
        {recent.map((alert, i) => {
          const cfg = typeConfig[alert.type] ?? typeConfig.general
          const Icon = cfg.icon
          return (
            <motion.button
              key={alert.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => { markAlertRead(alert.id); onTapAlert(alert) }}
              className={`w-full text-left bg-bg-surface rounded-xl border-l-2 ${cfg.color} p-3.5 pr-3 flex items-start gap-3 active:bg-bg-elevated transition-colors`}
            >
              <Icon size={14} className={`${cfg.iconColor} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-slate-800 text-sm font-medium truncate">{alert.title}</p>
                <p className="text-slate-400 text-xs truncate mt-0.5">{alert.body}</p>
                <p className="text-slate-600 text-[10px] mt-1">
                  {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                </p>
              </div>
              {!alert.read && <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0 mt-1`} />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
