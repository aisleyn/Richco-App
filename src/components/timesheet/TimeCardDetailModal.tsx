import { motion } from 'framer-motion'
import { X, MapPin, Clock, CheckCircle, AlertCircle, Truck, Image as ImageIcon } from 'lucide-react'
import type { TimesheetEntry } from '../../types'

interface TimeCardDetailModalProps {
  timecard: TimesheetEntry
  onClose: () => void
}

function formatTime(ms: number | string): string {
  const date = new Date(ms)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function TimeCardDetailModal({ timecard, onClose }: TimeCardDetailModalProps) {
  const photos = timecard.photos || []

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
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Shift Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date & Time Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Date</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {formatDate(timecard.date)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1 capitalize">
                {timecard.status}
              </p>
            </div>
          </div>

          {/* Site */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">Site</p>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{timecard.siteName}</p>
          </div>

          {/* Clock In Time */}
          <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">Clock In</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {formatDate(timecard.date)} at {formatTime(timecard.clockInTime)}
            </p>
            {timecard.gpsIn?.address && (
              <div className="mt-3 flex items-start gap-2 pt-3 border-t border-slate-300 dark:border-slate-600">
                <MapPin size={14} className="text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">GPS Address:</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 break-words">{timecard.gpsIn.address}</p>
                  {timecard.gpsIn.lat && timecard.gpsIn.lng && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {timecard.gpsIn.lat.toFixed(4)}, {timecard.gpsIn.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clock Out Time */}
          {timecard.clockOutTime && (
            <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">Clock Out</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formatDate(timecard.date)} at {formatTime(timecard.clockOutTime)}
              </p>
              {timecard.gpsOut?.address && (
                <div className="mt-3 flex items-start gap-2 pt-3 border-t border-slate-300 dark:border-slate-600">
                  <MapPin size={14} className="text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">GPS Address:</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 break-words">{timecard.gpsOut.address}</p>
                    {timecard.gpsOut.lat && timecard.gpsOut.lng && (
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {timecard.gpsOut.lat.toFixed(4)}, {timecard.gpsOut.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">Total Hours</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">
                {(timecard.totalHours || 0).toFixed(2)}h
              </p>
            </div>
            {(timecard.overtimeHours || 0) > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase">Overtime</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                  {(timecard.overtimeHours || 0).toFixed(2)}h
                </p>
              </div>
            )}
          </div>

          {/* Break */}
          <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-300 dark:border-slate-600">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-slate-600 dark:text-slate-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Mandatory Break</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {timecard.breakTaken ? 'Yes' : 'No'}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Duration: {(timecard.breakMinutes || 0)} minutes
              </p>
            </div>
          </div>

          {/* Shift Summary */}
          {timecard.shiftSummary && (
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">
                Work Completed
              </p>
              <p className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                {timecard.shiftSummary}
              </p>
            </div>
          )}

          {/* Concerns */}
          {timecard.concerns && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase">Concerns</p>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">{timecard.concerns}</p>
            </div>
          )}

          {/* Vehicle */}
          {timecard.vehicleUsed && (
            <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-300 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <Truck size={16} className="text-slate-600 dark:text-slate-400" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Vehicle Used</p>
              </div>
              <p className="text-sm text-slate-900 dark:text-white font-semibold">{timecard.vehicleUsed}</p>
            </div>
          )}

          {/* Photos */}
          {photos && photos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon size={16} className="text-slate-600 dark:text-slate-400" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Photos ({photos.length})
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(photos as any[]).map((photo, idx) => {
                  const photoUrl = typeof photo === 'string' ? photo : photo?.url || ''
                  return (
                    <a
                      key={idx}
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden hover:opacity-80 transition-opacity border border-slate-200 dark:border-slate-600"
                    >
                      <img
                        src={photoUrl}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="sticky bottom-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
