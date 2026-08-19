import { motion } from 'framer-motion'
import { X, AlertCircle, CheckCircle, Calendar } from 'lucide-react'
import type { LeaveRequest } from '../../services/timeoff'

interface Props {
  request: LeaveRequest | null
  onClose: () => void
}

export function TimeOffDetailModal({ request, onClose }: Props) {
  if (!request) return null

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-amber-500/15', text: 'text-amber-600', border: 'border-amber-500/30' },
    approved: { label: 'Approved', color: 'bg-emerald-500/15', text: 'text-emerald-600', border: 'border-emerald-500/30' },
    denied: { label: 'Denied', color: 'bg-red-500/15', text: 'text-red-600', border: 'border-red-500/30' },
  }

  const config = statusConfig[request.status]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4"
      >
        {/* Header with close button */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{request.employeeName}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{request.leaveType}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Status Badge */}
        <div className={`${config.color} ${config.border} border rounded-lg p-3 flex items-center gap-2`}>
          <span className={`px-2.5 py-1 ${config.color} ${config.text} text-xs font-bold rounded-full bg-white/50 dark:bg-slate-900/50`}>
            {config.label.toUpperCase()}
          </span>
        </div>

        {/* Dates */}
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">From</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                {new Date(request.startDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            <Calendar size={16} className="text-slate-400" />
            <div className="text-right">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">To</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                {new Date(request.endDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Days Requested</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{request.totalDays} days</p>
          </div>
        </div>

        {/* Reason */}
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase mb-2">Reason</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700">
            {request.reason || '—'}
          </p>
        </div>


        {/* Approval Info */}
        {request.status === 'approved' && request.approvedBy && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Approved</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                by {request.approvedBy} on {new Date(request.approvedDate || 0).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Denial Info */}
        {request.status === 'denied' && request.denialReason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-red-700 dark:text-red-300 font-semibold">Denial Reason</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{request.denialReason}</p>
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-semibold text-sm transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  )
}
