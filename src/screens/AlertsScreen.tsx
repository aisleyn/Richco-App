import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, Cloud, CalendarDays, MessageSquare, Truck, Clock, Award, X, Plus } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import { formatDistanceToNow } from 'date-fns'
import type { Alert } from '../types'
import { currentUser } from '../data/mockData'

const typeConfig: Record<string, { color: string; border: string; icon: typeof Info; iconColor: string; label: string }> = {
  urgent:      { color: 'border-l-red-500',    border: 'border-red-500/20',    icon: AlertTriangle, iconColor: 'text-red-400',    label: 'Urgent' },
  ceo:         { color: 'border-l-amber-500',  border: 'border-amber-500/20',  icon: MessageSquare, iconColor: 'text-amber-400',  label: 'CEO' },
  weather:     { color: 'border-l-blue-500',   border: 'border-blue-500/20',   icon: Cloud,         iconColor: 'text-blue-400',   label: 'Weather' },
  general:     { color: 'border-l-slate-500',  border: 'border-slate-200',       icon: Info,          iconColor: 'text-slate-400',  label: 'General' },
  schedule:    { color: 'border-l-purple-500', border: 'border-purple-500/20', icon: CalendarDays,  iconColor: 'text-purple-400', label: 'Schedule' },
  vendor:      { color: 'border-l-teal-500',   border: 'border-teal-500/20',   icon: Truck,         iconColor: 'text-teal-400',   label: 'Vendor' },
  timesheet:   { color: 'border-l-orange-500', border: 'border-orange-500/20', icon: Clock,         iconColor: 'text-orange-400', label: 'Timesheet' },
  certification:{ color: 'border-l-pink-500',  border: 'border-pink-500/20',   icon: Award,         iconColor: 'text-pink-400',   label: 'Certification' },
}

const isSupervisor = currentUser.role === 'supervisor' || currentUser.role === 'ceo' || currentUser.role === 'admin'

type PostType = 'urgent' | 'general' | 'weather' | 'schedule' | 'vendor' | 'ceo'

export function AlertsScreen(_props: { onNavigate?: (s: string) => void }) {
  const { alerts, markAlertRead, markAllAlertsRead, unreadAlertCount, addAlert } = useAppStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [postType, setPostType] = useState<PostType>('general')
  const [postTitle, setPostTitle] = useState('')
  const [postBody, setPostBody] = useState('')

  function handleExpand(alert: Alert) {
    setExpanded(expanded === alert.id ? null : alert.id)
    markAlertRead(alert.id)
  }

  function handlePost() {
    if (!postTitle.trim() || !postBody.trim()) return
    addAlert({
      id: `a-${Date.now()}`,
      type: postType,
      title: postTitle,
      body: postBody,
      timestamp: Date.now(),
      read: false,
      author: `${currentUser.firstName} ${currentUser.lastName}`,
    })
    setPostTitle('')
    setPostBody('')
    setShowCompose(false)
  }

  return (
    <AppLayout>
      <div className="pt-14">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-slate-800 text-2xl font-bold">Alerts</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {unreadAlertCount > 0 ? `${unreadAlertCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadAlertCount > 0 && (
              <button onClick={markAllAlertsRead} className="text-brand-amber text-xs font-medium">
                Mark All Read
              </button>
            )}
            {isSupervisor && (
              <button
                onClick={() => setShowCompose(true)}
                className="w-9 h-9 rounded-full bg-brand-amber flex items-center justify-center"
              >
                <Plus size={18} className="text-slate-900" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {alerts.map((alert, i) => {
            const cfg = typeConfig[alert.type] ?? typeConfig.general
            const Icon = cfg.icon
            const isOpen = expanded === alert.id
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
                className={`bg-bg-surface rounded-xl border-l-2 border ${cfg.color} ${cfg.border} overflow-hidden`}
              >
                <button
                  onClick={() => handleExpand(alert)}
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <Icon size={15} className={`${cfg.iconColor} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold truncate ${!alert.read ? 'text-slate-800' : 'text-slate-300'}`}>{alert.title}</p>
                      {!alert.read && <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                    </div>
                    <p className="text-slate-400 text-xs truncate mt-0.5">{alert.body}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-bg-elevated ${cfg.iconColor}`}>
                        {cfg.label}
                      </span>
                      <span className="text-slate-600 text-[10px]">
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-slate-200">
                        <p className="text-slate-300 text-sm leading-relaxed mt-3">{alert.body}</p>
                        {alert.author && (
                          <p className="text-slate-500 text-xs mt-3">— {alert.author}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Compose modal */}
      <AnimatePresence>
        {showCompose && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-bg-base w-full rounded-t-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-200">
                <h2 className="text-slate-800 font-bold text-lg">Post Notification</h2>
                <button onClick={() => setShowCompose(false)} className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-medium block mb-2">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(['urgent', 'general', 'weather', 'schedule', 'vendor', 'ceo'] as PostType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setPostType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${postType === t ? 'bg-brand-amber text-slate-900' : 'bg-bg-surface text-slate-400 border border-white/10'}`}
                      >
                        {t === 'ceo' ? 'CEO Message' : t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-medium block mb-2">Title</label>
                  <input value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="Notification title..." className="w-full bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-slate-800 text-sm placeholder:text-slate-600" />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-medium block mb-2">Message</label>
                  <textarea value={postBody} onChange={e => setPostBody(e.target.value)} rows={4} placeholder="Full notification message..." className="w-full bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-slate-800 text-sm resize-none placeholder:text-slate-600" />
                </div>

                <button
                  onClick={handlePost}
                  disabled={!postTitle.trim() || !postBody.trim()}
                  className="w-full py-4 bg-brand-amber disabled:opacity-40 rounded-xl text-slate-900 font-bold"
                >
                  Post to All Crew
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}
