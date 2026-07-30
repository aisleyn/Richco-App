import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown, HelpCircle, Send, ArrowRight } from 'lucide-react'
import { Avatar } from './Avatar'
import { ReactionTooltip } from './ReactionTooltip'
import { capitalizeName } from '../utils/formatting'
import { getCommentReplies, addCommentReply, addCommentReaction, getCommentReactions, getCommentReactionDetails, trackCommentView, type NotificationComment, type CommentReply, type ReactionDetail } from '../services/notificationDetails'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  comment: NotificationComment | CommentReply
  currentUserName: string
  currentUserEmail: string
  depth?: number
  replyToId?: string
}

interface NestedReplyProps extends Props {
  onReplyAdded: () => void
}

function NestedReplyComponent({ comment, currentUserName, currentUserEmail, depth = 0, replyToId, onReplyAdded }: NestedReplyProps) {
  const isCommentReply = 'reply' in comment
  const commentReply = comment as CommentReply
  const notificationComment = comment as NotificationComment
  const text = isCommentReply ? commentReply.reply : notificationComment.comment
  const replyToAuthorName = isCommentReply ? commentReply.replyToAuthor : undefined
  const commentId = isCommentReply ? commentReply.commentId : notificationComment.id
  const preloadedReplies = isCommentReply ? (commentReply.nestedReplies || []) : []
  const [reactions, setReactions] = useState({ like: 0, dislike: 0, question: 0 })
  const [reactionDetails, setReactionDetails] = useState<ReactionDetail[]>([])
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set())
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replies, setReplies] = useState<CommentReply[]>(preloadedReplies)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadData = async () => {
      const loadPromises: Promise<any>[] = [
        getCommentReactions(comment.id),
        getCommentReactionDetails(comment.id),
      ]

      // For top-level comments, load direct replies
      if (!isCommentReply) {
        loadPromises.push(getCommentReplies(commentId, undefined))
      }

      const results = await Promise.all(loadPromises)
      const [reactionCounts, details, loadedReplies] = results

      setReactions(reactionCounts as { like: number; dislike: number; question: number })
      setReactionDetails(details)
      console.log('[CommentCard] Loaded reactions:', { counts: reactionCounts, details, commentId: comment.id })

      const userReactionTypes = new Set<string>(details.filter((r: ReactionDetail) => r.author === currentUserEmail).map((r: ReactionDetail) => r.reactionType))
      setUserReactions(userReactionTypes)

      if (loadedReplies) {
        console.log('[CommentCard] Loaded replies for comment:', { count: loadedReplies.length, commentId })
        setReplies(loadedReplies)
      }

      if (containerRef.current) {
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
        observer.observe(containerRef.current)
        return () => observer.disconnect()
      }
    }

    loadData()
  }, [comment.id, commentId, currentUserEmail, isCommentReply])

  async function handleReaction(reactionType: 'like' | 'dislike' | 'question') {
    const hasReacted = userReactions.has(reactionType)
    const success = await addCommentReaction(comment.id, reactionType, currentUserEmail)

    if (success) {
      const newReactions = new Set(userReactions)
      if (hasReacted) {
        newReactions.delete(reactionType)
        setReactions((prev) => ({ ...prev, [reactionType]: Math.max(0, prev[reactionType] - 1) }))
      } else {
        newReactions.add(reactionType)
        setReactions((prev) => ({ ...prev, [reactionType]: prev[reactionType] + 1 }))
      }
      setUserReactions(newReactions)

      // Reload reaction details
      const details = await getCommentReactionDetails(comment.id)
      setReactionDetails(details)
    }
  }

  async function handleSubmitReply() {
    if (!replyText.trim() || submitting) return
    setSubmitting(true)

    const parentReplyId = isCommentReply ? comment.id : undefined
    const result = await addCommentReply(commentId, replyText.trim(), currentUserName, parentReplyId)
    if (result) {
      setReplies([...replies, result])
      setReplyText('')
      setShowReplyForm(false)
      onReplyAdded()
    }
    setSubmitting(false)
  }

  const paddingClass = depth > 0 ? 'ml-4 pl-4 border-l border-slate-200 dark:border-slate-700' : ''

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg bg-bg-base dark:bg-bg-base-dark p-4 space-y-3 ${paddingClass}`}
    >
      {/* Reply-to indicator for nested replies */}
      {replyToAuthorName && (
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
          <ArrowRight size={12} />
          <span>Reply to {capitalizeName(replyToAuthorName)}</span>
        </div>
      )}

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
        {text}
      </p>

      {/* Reactions */}
      <div className="flex items-center gap-2 pt-2">
        <ReactionTooltip reactions={reactionDetails.filter(r => r.reactionType === 'like')}>
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
        </ReactionTooltip>

        <ReactionTooltip reactions={reactionDetails.filter(r => r.reactionType === 'dislike')}>
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
        </ReactionTooltip>

        <ReactionTooltip reactions={reactionDetails.filter(r => r.reactionType === 'question')}>
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
        </ReactionTooltip>

        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="ml-auto text-green-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-medium"
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
              disabled={submitting}
              className="w-full px-3 py-2 bg-bg-surface dark:bg-bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 resize-none text-sm disabled:opacity-50"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReplyForm(false)}
                disabled={submitting}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReply}
                disabled={!replyText.trim() || submitting}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Send size={12} />
                {submitting ? 'Posting...' : 'Reply'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="space-y-3 pt-2">
          {replies.map((reply) => (
            <NestedReplyComponent
              key={reply.id}
              comment={reply}
              currentUserName={currentUserName}
              currentUserEmail={currentUserEmail}
              depth={(depth || 0) + 1}
              replyToId={reply.id}
              onReplyAdded={() => {
                // Child components manage their own state; no parent reloading needed
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function CommentCard({ comment, currentUserName, currentUserEmail }: Props) {
  return (
    <NestedReplyComponent
      comment={comment}
      currentUserName={currentUserName}
      currentUserEmail={currentUserEmail}
      onReplyAdded={() => {}}
    />
  )
}
