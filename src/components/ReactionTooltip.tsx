import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { capitalizeName } from '../utils/formatting'

interface ReactionDetail {
  author: string
  reactionType: 'like' | 'dislike' | 'question'
}

interface Props {
  reactions: ReactionDetail[]
  children: React.ReactNode
}

export function ReactionTooltip({ reactions, children }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Group reactions by type
  const groupedReactions = {
    like: reactions.filter(r => r.reactionType === 'like').map(r => capitalizeName(r.author)),
    dislike: reactions.filter(r => r.reactionType === 'dislike').map(r => capitalizeName(r.author)),
    question: reactions.filter(r => r.reactionType === 'question').map(r => capitalizeName(r.author)),
  }

  return (
    <div className="relative inline-block" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {children}

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 dark:bg-slate-950 text-white rounded-lg shadow-lg p-3 text-xs whitespace-nowrap"
          >
            <div className="space-y-1.5 max-w-xs">
              {groupedReactions.like.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">👍</span>
                  <span>{groupedReactions.like.join(', ')}</span>
                </div>
              )}
              {groupedReactions.dislike.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-red-400">👎</span>
                  <span>{groupedReactions.dislike.join(', ')}</span>
                </div>
              )}
              {groupedReactions.question.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">❓</span>
                  <span>{groupedReactions.question.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1.5 w-2 h-2 bg-slate-900 dark:bg-slate-950 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
