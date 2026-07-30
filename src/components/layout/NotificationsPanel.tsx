import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getAllNotifications, deleteNotification, type Notification } from '../../services/notificationService'

interface Props {
  onNotificationClick?: (notification: Notification) => void
}

export function NotificationsPanel({ onNotificationClick }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  // Load notifications from Supabase
  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true)
      const data = await getAllNotifications()
      setNotifications(data)
      setLoading(false)
    }

    loadNotifications()

    // Listen for new notifications posted
    const handleNotificationPosted = () => {
      loadNotifications()
    }

    const handleNotificationCleared = () => {
      setNotifications([])
    }

    const handleNotificationDeleted = () => {
      loadNotifications()
    }

    window.addEventListener('notification:posted', handleNotificationPosted)
    window.addEventListener('notification:cleared', handleNotificationCleared)
    window.addEventListener('notification:deleted', handleNotificationDeleted)

    // Poll for updates every 10 seconds to catch changes from other tabs
    const pollInterval = setInterval(loadNotifications, 10000)

    return () => {
      window.removeEventListener('notification:posted', handleNotificationPosted)
      window.removeEventListener('notification:cleared', handleNotificationCleared)
      window.removeEventListener('notification:deleted', handleNotificationDeleted)
      clearInterval(pollInterval)
    }
  }, [])

  const removeNotification = async (id: string) => {
    const success = await deleteNotification(id)
    if (success) {
      setNotifications(notifications.filter(n => n.id !== id))
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'alert': return 'border-l-red-500 bg-red-50 dark:bg-red-950'
      case 'announcement': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950'
      default: return 'border-l-green-500 bg-green-50 dark:bg-green-950'
    }
  }

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="hidden md:flex flex-col w-80 bg-white border-r border-slate-200 overflow-hidden fixed left-0 top-0 h-screen z-40">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-green-200/40 to-white">
        <Bell size={20} className="text-green-600" />
        <h2 className="font-semibold text-slate-900">Updates</h2>
        {notifications.length > 0 && (
          <span className="ml-auto text-xs bg-green-600 text-white rounded-md px-2 py-1">
            {notifications.length}
          </span>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 px-4">
            <Bell size={32} className="opacity-30 mb-2" />
            <p className="text-sm text-center">No updates yet</p>
            <p className="text-xs opacity-75 text-center mt-2">Admin updates will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`rounded-lg border-l-4 p-3 space-y-1 cursor-pointer hover:opacity-80 transition-opacity ${getTypeColor(notification.type)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onNotificationClick?.(notification)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {notification.title}
                        </p>
                        <span className="text-xs bg-white/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          {getTypeLabel(notification.type)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-600 dark:text-slate-400">
                        <span className="font-medium">{notification.author}</span>
                        <span className="opacity-50">
                          {notification.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      title="Dismiss"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
