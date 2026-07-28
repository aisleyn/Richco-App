import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Eye, MessageCircle, Send, AlertTriangle, Info, Cloud, CalendarDays, Truck, Megaphone, X } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import { getNotificationComments, addNotificationComment, trackNotificationView, getNotificationViews, getNotificationViewers, type NotificationComment } from '../services/notificationDetails'
import type { Notification } from '../services/notificationService'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  notification: Notification
  onBack: () => void
}

const typeConfig: Record<string, { icon: typeof Info; color: string }> = {
  alert: { icon: AlertTriangle, color: 'text-red-400' },
  announcement: { icon: Megaphone, color: 'text-blue-400' },
  update: { icon: Info, color: 'text-green-400' },
}

export function NotificationDetailScreen({ notification, onBack }: Props) {
  const { currentUserEmail, currentUserName } = useAppStore()
  const [comments, setComments] = useState<NotificationComment[]>([])
  const [viewCount, setViewCount] = useState(0)
  const [viewers, setViewers] = useState<{ email: string; viewedAt: Date }[]>([])
  const [showViewers, setShowViewers] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadDetails = async () => {
      // Track this view
      if (currentUserEmail) {
        await trackNotificationView(notification.id, currentUserEmail)
      }

      // Load comments, view count, and viewers list
      const [loadedComments, views, viewersList] = await Promise.all([
        getNotificationComments(notification.id),
        getNotificationViews(notification.id),
        getNotificationViewers(notification.id),
      ])

      setComments(loadedComments)
      setViewCount(views)
      setViewers(viewersList)
      setLoading(false)
    }

    loadDetails()
  }, [notification.id, currentUserEmail])

  async function handleSubmitComment() {
    if (!newComment.trim() || !currentUserEmail) return

    setSubmitting(true)
    const result = await addNotificationComment(
      notification.id,
      newComment.trim(),
      currentUserName || 'Anonymous'
    )
    setSubmitting(false)

    if (result) {
      setComments([result, ...comments])
      setNewComment('')
    }
  }

  const cfg = typeConfig[notification.type] || typeConfig.update
  const Icon = cfg.icon

  return (
    <AppLayout>
      <div className="pt-6 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm mb-6"
          >
            <ArrowLeft size={16} /> Back to Updates
          </button>

          {/* Notification card */}
          <div className="bg-bg-surface dark:bg-bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <Icon size={20} className={cfg.color} />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {notification.title}
                </h1>
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                  <span className="font-medium">{notification.author}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              {notification.message}
            </p>

            {/* View count */}
            <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowViewers(true)}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Eye size={16} />
                <span className="text-sm font-medium">{viewCount} {viewCount === 1 ? 'view' : 'views'}</span>
              </button>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <MessageCircle size={16} />
                <span className="text-sm font-medium">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Comments section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-surface dark:bg-bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 p-6"
        >
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
            Comments ({comments.length})
          </h2>

          {/* Add comment */}
          <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              disabled={submitting}
              className="w-full px-4 py-3 bg-bg-base dark:bg-bg-base-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none disabled:opacity-50"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                <Send size={14} />
                {submitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>

          {/* Comments list */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-bg-base dark:bg-bg-base-dark p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                      {comment.author}
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs">
                      {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    {comment.comment}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Viewers Modal */}
        <AnimatePresence>
          {showViewers && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-bg-base dark:bg-bg-base-dark rounded-xl border border-slate-200 dark:border-slate-700 max-w-sm w-full max-h-[80vh] overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
                  <h2 className="font-bold text-slate-800 dark:text-slate-100">Who Viewed This</h2>
                  <button
                    onClick={() => setShowViewers(false)}
                    className="w-8 h-8 rounded-full bg-bg-surface flex items-center justify-center"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {viewers.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                      <p className="text-sm">No views yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-700">
                      {viewers.map((viewer, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="px-6 py-3 flex items-center justify-between"
                        >
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {viewer.email}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDistanceToNow(viewer.viewedAt, { addSuffix: true })}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  )
}
