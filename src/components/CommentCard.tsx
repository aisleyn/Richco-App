import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown, HelpCircle, Send } from 'lucide-react'
import { Avatar } from './Avatar'
import { capitalizeName } from '../utils/formatting'
import { getCommentReplies, addCommentReply, addCommentReaction, getCommentReactions, trackCommentView, type NotificationComment, type CommentReply } from '../services/notificationDetails'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  comment: NotificationComment
  currentUserName: string
  currentUserEmail: string
}

export function CommentCard({ comment, currentUserName, currentUserEmail }: Props) {
  const [replies, setReplies] = useState<CommentReply[]>([])
  const [reactions, setReactions] = useState({ like: 0, dislike: 0, question: 0 })
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadCommentData = async () => {
      // Track view when visible on screen using Intersection Observer
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              trackCommentView(comment.id, currentUserEmail)
              observer.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.5 }
      )

      if (containerRef.current) {
        observer.observe(containerRef.current)
      }

      // Load replies and reactions
      const [loadedReplies, reactionCounts] = await Promise.all([
        getCommentReplies(comment.id),
        getCommentReactions(comment.id),
      ])

      setReplies(loadedReplies)
      setReactions(reactionCounts as { like: number; dislike: number; question: number })
      setLoading(false)

      return () => observer.disconnect()
    }

    loadCommentData()
  }, [comment.id, currentUserEmail])

  async function handleReaction(reactionType: 'like' | 'dislike' | 'question') {
    const key = `${reactionType}`
    const hasReacted = userReactions.has(key)

    const success = await addCommentReaction(comment.id, reactionType, currentUserEmail)
    if (success) {
      const newReactions = new Set(userReactions)
      if (hasReacted) {
        newReactions.delete(key)
        setReactions((prev) => ({ ...prev, [reactionType]: Math.max(0, prev[reactionType] - 1) }))
      } else {
        newReactions.add(key)
        setReactions((prev) => ({ ...prev, [reactionType]: prev[reactionType] + 1 }))
      }
      setUserReactions(newReactions)
    }
  }

  async function handleSubmitReply() {
    if (!replyText.trim()) return

    const result = await addCommentReply(comment.id, replyText.trim(), currentUserName)
    if (result) {
      setReplies([...replies, result])
      setReplyText('')
      setShowReplyForm(false)
    }
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg bg-bg-base dark:bg-bg-base-dark p-4 space-y-3"
    >
      {/* Comment header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Avatar name={comment.author} size="sm" />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">
              {capitalizeName(comment.author)}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs">
              {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Comment text */}
      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        {comment.comment}
      </p>

      {/* Reactions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={() => handleReaction('like')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            userReactions.has('like')
              ? 'bg-blue-500/20 text-blue-500'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          <ThumbsUp size={12} />
          {reactions.like > 0 && reactions.like}
        </button>
        <button
          onClick={() => handleReaction('dislike')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            userReactions.has('dislike')
              ? 'bg-red-500/20 text-red-500'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          <ThumbsDown size={12} />
          {reactions.dislike > 0 && reactions.dislike}
        </button>
        <button
          onClick={() => handleReaction('question')}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            userReactions.has('question')
              ? 'bg-amber-500/20 text-amber-500'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          <HelpCircle size={12} />
          {reactions.question > 0 && reactions.question}
        </button>
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="ml-auto text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-medium"
        >
          Reply
        </button>
      </div>

      {/* Reply form */}
      <AnimatePresence>
        {showReplyForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700"
          >
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="w-full px-3 py-2 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReplyForm(false)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Send size={12} />
                Reply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-2 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg">
              <Avatar name={reply.author} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                    {capitalizeName(reply.author)}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">
                    {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                  </p>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm mt-1">
                  {reply.reply}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
