import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Eye, MessageCircle, Send, AlertTriangle, Info, Cloud, CalendarDays, Truck, Megaphone, X, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAppStore } from '../store/appStore'
import { getNotificationComments, addNotificationComment, trackNotificationView, getNotificationViews, getNotificationViewers, addCommentReply, getCommentReplies, addCommentReaction, getCommentReactions, trackCommentView, addNotificationReaction, getNotificationReactions, type NotificationComment, type CommentReply } from '../services/notificationDetails'
import { Avatar } from '../components/Avatar'
import { CommentCard } from '../components/CommentCard'
import { capitalizeName } from '../utils/formatting'
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
  const [notificationReactions, setNotificationReactions] = useState({ like: 0, dislike: 0, question: 0 })
  const [userNotificationReactions, setUserNotificationReactions] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadDetails = async () => {
      // Track this view
      if (currentUserEmail) {
        await trackNotificationView(notification.id, currentUserEmail)
      }

      // Load comments, view count, viewers list, and reactions
      const [loadedComments, views, viewersList, reactions] = await Promise.all([
        getNotificationComments(notification.id),
        getNotificationViews(notification.id),
        getNotificationViewers(notification.id),
        getNotificationReactions(notification.id),
      ])

      setComments(loadedComments)
      setViewCount(views)
      setViewers(viewersList)
      setNotificationReactions(reactions as { like: number; dislike: number; question: number })
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

  async function handleNotificationReaction(reactionType: 'like' | 'dislike' | 'question') {
    const key = reactionType
    const hasReacted = userNotificationReactions.has(key)

    const success = await addNotificationReaction(notification.id, reactionType, currentUserEmail || '')
    if (success) {
      const newReactions = new Set(userNotificationReactions)
      if (hasReacted) {
        newReactions.delete(key)
        setNotificationReactions((prev) => ({ ...prev, [reactionType]: Math.max(0, prev[reactionType] - 1) }))
      } else {
        newReactions.add(key)
        setNotificationReactions((prev) => ({ ...prev, [reactionType]: prev[reactionType] + 1 }))
      }
      setUserNotificationReactions(newReactions)
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
            className="flex items-center gap-2 text-green-600 hover:text-blue-700 font-medium text-sm mb-6"
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
                <div className="flex items-center gap-3 mt-3">
                  <Avatar name={notification.author} size="sm" />
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {capitalizeName(notification.author)}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              {notification.message}
            </p>

            {/* Reactions and stats */}
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              {/* Reaction buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNotificationReaction('like')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    userNotificationReactions.has('like')
                      ? 'bg-blue-500/20 text-blue-500'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <ThumbsUp size={13} />
                  {notificationReactions.like > 0 && notificationReactions.like}
                </button>
                <button
                  onClick={() => handleNotificationReaction('dislike')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    userNotificationReactions.has('dislike')
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <ThumbsDown size={13} />
                  {notificationReactions.dislike > 0 && notificationReactions.dislike}
                </button>
                <button
                  onClick={() => handleNotificationReaction('question')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    userNotificationReactions.has('question')
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <HelpCircle size={13} />
                  {notificationReactions.question > 0 && notificationReactions.question}
                </button>
              </div>

              {/* View count and comments */}
              <div className="flex items-center gap-4">
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
              className="w-full px-4 py-3 bg-bg-base dark:bg-bg-base-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 resize-none disabled:opacity-50"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSubmitComment}
                disabled={submitting || !newComment.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
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
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  currentUserName={currentUserName}
                  currentUserEmail={currentUserEmail}
                />
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
