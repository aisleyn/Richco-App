import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Notification {
  id: string
  title: string
  message: string
  author: string
  timestamp: Date
  type: 'update' | 'alert' | 'announcement'
}

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Load notifications from localStorage and listen for updates
  useEffect(() => {
    const loadNotifications = () => {
      const stored = localStorage.getItem('admin_notifications')
      if (stored) {
        const parsed = JSON.parse(stored)
        setNotifications(parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })))
      }
    }

    loadNotifications()

    // Listen for new notifications posted
    const handleNotificationPosted = (e: Event) => {
      loadNotifications()
    }

    const handleNotificationCleared = () => {
      setNotifications([])
    }

    window.addEventListener('notification:posted', handleNotificationPosted)
    window.addEventListener('notification:cleared', handleNotificationCleared)

    return () => {
      window.removeEventListener('notification:posted', handleNotificationPosted)
      window.removeEventListener('notification:cleared', handleNotificationCleared)
    }
  }, [])

  const removeNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id)
    setNotifications(updated)
    localStorage.setItem('admin_notifications', JSON.stringify(updated))
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
    <div className="hidden md:flex flex-col w-80 bg-bg-surface dark:bg-bg-surface-dark border-r border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-600/10 to-blue-600/5">
        <Bell size={20} className="text-blue-600" />
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Updates</h2>
        {notifications.length > 0 && (
          <span className="ml-auto text-xs bg-blue-600 text-white rounded-full px-2 py-1">
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
                  className={`rounded-lg border-l-4 p-3 space-y-1 ${getTypeColor(notification.type)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
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
                    </div>
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
