import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Clock, Briefcase, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { ImageViewerModal } from '../ImageViewerModal'
import type { TimeEntry } from '../../types'

interface Props {
  isOpen: boolean
  timeEntry: TimeEntry | null
  onClose: () => void
  isAdmin?: boolean
  onEdit?: () => void
}

export function TimecardPreviewModal({ isOpen, timeEntry, onClose, isAdmin, onEdit }: Props) {
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState<number | null>(null)

  if (!isOpen || !timeEntry) return null

  const photos = timeEntry.photos || []

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">Timecard Preview</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {new Date(timeEntry.clock_in_time).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Hours summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">Regular Hours</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                  {(timeEntry.regular_hours || 0).toFixed(2)}h
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Overtime</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                  {(timeEntry.overtime_hours || 0).toFixed(2)}h
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Break</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                  {(timeEntry.break_hours || 0).toFixed(2)}h
                </p>
              </div>
            </div>

            {/* Time details */}
            <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-slate-400" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Clock In</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {new Date(timeEntry.clock_in_time).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {timeEntry.clock_out_time && (
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Clock Out</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {new Date(timeEntry.clock_out_time).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Site & Vehicle */}
            <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Site</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {timeEntry.site_name}
                  </p>
                </div>
              </div>
              {timeEntry.vehicle_used && (
                <div className="flex items-start gap-3">
                  <Briefcase size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Vehicle</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {timeEntry.vehicle_used}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Work Summary */}
            {timeEntry.shift_notes && (
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Work Completed
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {timeEntry.shift_notes}
                  </p>
                </div>
              </div>
            )}

            {/* Concerns */}
            {timeEntry.concerns && (
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={14} /> Issues Reported
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-900/30">
                  <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
                    {timeEntry.concerns}
                  </p>
                </div>
              </div>
            )}

            {/* Admin Adjustments */}
            {timeEntry.adjusted_by_admin && (
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Admin Adjustment
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900/30 space-y-2">
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-400">Adjusted Hours</p>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                      {(timeEntry.adjusted_hours || 0).toFixed(2)}h
                    </p>
                  </div>
                  {timeEntry.admin_adjustment_note && (
                    <div>
                      <p className="text-xs text-blue-700 dark:text-blue-400">Reason</p>
                      <p className="text-sm text-blue-900 dark:text-blue-200">
                        {timeEntry.admin_adjustment_note}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Proof of Work ({photos.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photoUrl, i) => (
                    <button
                      key={i}
                      onClick={() => setExpandedPhotoIndex(i)}
                      className="aspect-square rounded-lg overflow-hidden hover:opacity-75 transition-opacity"
                    >
                      <img
                        src={photoUrl}
                        alt={`Work photo ${i + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Edit button (admin only) */}
            {isAdmin && onEdit && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <button
                  onClick={onEdit}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Edit Hours
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Image viewer modal for expanded photos */}
        {photos.length > 0 && (
          <ImageViewerModal
            isOpen={expandedPhotoIndex !== null}
            imageUrl={expandedPhotoIndex !== null ? photos[expandedPhotoIndex] : ''}
            fileName={`proof-of-work-${(expandedPhotoIndex || 0) + 1}`}
            onClose={() => setExpandedPhotoIndex(null)}
            currentIndex={expandedPhotoIndex || 0}
            totalImages={photos.length}
            onPrev={() => {
              if (expandedPhotoIndex !== null && expandedPhotoIndex > 0) {
                setExpandedPhotoIndex(expandedPhotoIndex - 1)
              }
            }}
            onNext={() => {
              if (expandedPhotoIndex !== null && expandedPhotoIndex < photos.length - 1) {
                setExpandedPhotoIndex(expandedPhotoIndex + 1)
              }
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
