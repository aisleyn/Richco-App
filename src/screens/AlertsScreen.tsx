import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, Cloud, CalendarDays, MessageSquare, Truck, Clock, Award, X, Plus } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import { formatDistanceToNow } from 'date-fns'
import type { Alert } from '../types'
import { approveRequest, denyRequest, getRequestById } from '../services/timeoff'
import { isUserAdmin, getAllCrew } from '../services/crew'
import { postNotification } from '../services/notificationService'

const typeConfig: Record<string, { color: string; border: string; icon: typeof Info; iconColor: string; label: string }> = {
  urgent:      { color: 'border-l-red-500',    border: 'border-red-500/20',    icon: AlertTriangle, iconColor: 'text-red-400',    label: 'Urgent' },
  weather:     { color: 'border-l-blue-500',   border: 'border-blue-500/20',   icon: Cloud,         iconColor: 'text-blue-400',   label: 'Weather' },
  general:     { color: 'border-l-slate-500',  border: 'border-slate-200',       icon: Info,          iconColor: 'text-slate-400',  label: 'General' },
  schedule:    { color: 'border-l-purple-500', border: 'border-purple-500/20', icon: CalendarDays,  iconColor: 'text-purple-400', label: 'Schedule' },
  vendor:      { color: 'border-l-teal-500',   border: 'border-teal-500/20',   icon: Truck,         iconColor: 'text-teal-400',   label: 'Vendor' },
  timesheet:   { color: 'border-l-orange-500', border: 'border-orange-500/20', icon: Clock,         iconColor: 'text-orange-400', label: 'Timesheet' },
  certification:{ color: 'border-l-pink-500',  border: 'border-pink-500/20',   icon: Award,         iconColor: 'text-pink-400',   label: 'Certification' },
  leave_request:{ color: 'border-l-emerald-500', border: 'border-emerald-500/20', icon: CalendarDays, iconColor: 'text-emerald-400', label: 'Leave Request' },
}

type PostType = 'urgent' | 'general' | 'weather' | 'schedule' | 'vendor'

interface Props {
  onNavigate?: (s: string) => void
  onAlertClick?: (alert: Alert) => void
}

export function AlertsScreen({ onNavigate, onAlertClick }: Props) {
  const { alerts, markAlertRead, markAllAlertsRead, unreadAlertCount, addAlert, currentUserEmail, currentUserName } = useAppStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [postType, setPostType] = useState<PostType>('general')
  const [postTitle, setPostTitle] = useState('')
  const [postBody, setPostBody] = useState('')
  const [denyingAlertId, setDenyingAlertId] = useState<string | null>(null)
  const [denialReason, setDenialReason] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCEO, setIsCEO] = useState(false)

  useEffect(() => {
    const loadUserStatus = async () => {
      const admin = await isUserAdmin(currentUserEmail)
      setIsAdmin(admin)
      const crew = await getAllCrew()
      const userIsCEO = crew.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase())?.role === 'ceo'
      setIsCEO(userIsCEO ?? false)
    }
    loadUserStatus()
  }, [currentUserEmail])

  const canApprove = isAdmin || isCEO
  const isSupervisor = isAdmin || isCEO

  function handleExpand(alert: Alert) {
    markAlertRead(alert.id)
    // Navigate to detail view instead of expanding
    onAlertClick?.(alert)
  }

  async function handlePost() {
    if (!postTitle.trim() || !postBody.trim()) return

    // Post to Supabase for persistence
    const notificationType = postType === 'urgent' ? 'alert' : postType === 'weather' ? 'announcement' : 'update'
    const result = await postNotification(postTitle.trim(), postBody.trim(), currentUserEmail || 'Admin', notificationType)

    if (result) {
      console.log('[AlertsScreen] Notification posted to Supabase:', result.id)
    } else {
      console.error('[AlertsScreen] Failed to post notification to Supabase')
    }

    // Also add to local alerts for immediate display
    addAlert({
      id: `a-${Date.now()}`,
      type: postType,
      title: postTitle,
      body: postBody,
      timestamp: Date.now(),
      read: false,
      author: currentUserName,
    })
    setPostTitle('')
    setPostBody('')
    setShowCompose(false)
  }

  function handleApproveLeave(alert: Alert) {
    if (alert.leaveRequestId) {
      approveRequest(alert.leaveRequestId, currentUserName)
      markAlertRead(alert.id)
      setExpanded(null)
    }
  }

  function handleDenyLeave(alert: Alert) {
    if (alert.leaveRequestId && denialReason.trim()) {
      denyRequest(alert.leaveRequestId, denialReason)
      markAlertRead(alert.id)
      setDenyingAlertId(null)
      setDenialReason('')
      setExpanded(null)
    }
  }

  return (
    <AppLayout>
      <div className="pt-14">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-slate-800 dark:text-slate-100 text-xl md:text-2xl font-bold">Alerts</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-0.5">
              {unreadAlertCount > 0 ? `${unreadAlertCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadAlertCount > 0 && (
              <button onClick={markAllAlertsRead} className="text-blue-600 text-xs font-medium">
                Mark All Read
              </button>
            )}
            {isSupervisor && (
              <button
                onClick={() => setShowCompose(true)}
                className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center"
              >
                <Plus size={18} className="text-slate-900" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {alerts.map((alert, i) => {
            const cfg = typeConfig[alert.type] ?? typeConfig.general
            const Icon = cfg.icon
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
                className={`bg-bg-surface dark:bg-bg-surface-dark rounded-xl border-l-4 ${cfg.color} ${cfg.border} overflow-hidden`}
              >
                <button
                  onClick={() => handleExpand(alert)}
                  className="w-full text-left p-4"
                >
                  {/* User info header */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {alert.author?.charAt(0).toUpperCase() || 'A'}
                    </div>

                    {/* User details and time */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                        {alert.author || 'System'}
                      </p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">
                        {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!alert.read && <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />}
                  </div>

                  {/* Alert content */}
                  <div className="pl-0">
                    {/* Title */}
                    <p className={`text-sm font-bold ${!alert.read ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {alert.title}
                    </p>

                    {/* Body preview */}
                    <p className="text-slate-600 dark:text-slate-400 text-xs mt-1.5 line-clamp-2">
                      {alert.body}
                    </p>

                    {/* Alert type badge */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full bg-bg-elevated dark:bg-bg-elevated-dark ${cfg.iconColor}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </button>
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
              className="bg-bg-base dark:bg-bg-base-dark w-full rounded-t-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-slate-800 dark:text-slate-100 font-bold text-lg">Post Notification</h2>
                <button onClick={() => setShowCompose(false)} className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider font-medium block mb-2">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(['urgent', 'general', 'weather', 'schedule', 'vendor'] as PostType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setPostType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${postType === t ? 'bg-blue-600 text-slate-900' : 'bg-bg-elevated dark:bg-bg-elevated-dark text-slate-400 dark:text-slate-500 border border-white/10 dark:border-white/5'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider font-medium block mb-2">Title</label>
                  <input value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="Notification title..." className="w-full bg-bg-elevated dark:bg-bg-elevated-dark border border-white/10 dark:border-white/5 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 text-sm placeholder:text-slate-600 dark:placeholder:text-slate-500" />
                </div>

                <div>
                  <label className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider font-medium block mb-2">Message</label>
                  <textarea value={postBody} onChange={e => setPostBody(e.target.value)} rows={4} placeholder="Full notification message..." className="w-full bg-bg-elevated dark:bg-bg-elevated-dark border border-white/10 dark:border-white/5 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 text-sm resize-none placeholder:text-slate-600 dark:placeholder:text-slate-500" />
                </div>

                <button
                  onClick={handlePost}
                  disabled={!postTitle.trim() || !postBody.trim()}
                  className="w-full py-4 bg-blue-600 disabled:opacity-40 rounded-xl text-slate-900 font-bold"
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
