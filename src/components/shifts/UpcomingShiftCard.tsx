import { useEffect, useState } from 'react'
import { Clock, MapPin } from 'lucide-react'
import { getTodayShift, getShiftLocations } from '../../services/supabase'
import type { ShiftData, ShiftLocationData } from '../../services/supabase'

interface Props {
  crewMemberId: number
  isLoading?: boolean
}

export function UpcomingShiftCard({ crewMemberId, isLoading = false }: Props) {
  const [shift, setShift] = useState<ShiftData | null>(null)
  const [locations, setLocations] = useState<ShiftLocationData[]>([])
  const [progressPercent, setProgressPercent] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [loading, setLoading] = useState(isLoading)

  useEffect(() => {
    fetchShift()
  }, [crewMemberId])

  useEffect(() => {
    if (!shift) return

    const updateProgress = () => {
      const now = new Date()
      const [startHour, startMin] = shift.start_time.split(':').map(Number)
      const [endHour, endMin] = shift.end_time.split(':').map(Number)

      const startMs = startHour * 3600000 + startMin * 60000
      const endMs = endHour * 3600000 + endMin * 60000
      const nowMs = now.getHours() * 3600000 + now.getMinutes() * 60000

      const percent = Math.max(0, Math.min(100, ((nowMs - startMs) / (endMs - startMs)) * 100))
      setProgressPercent(percent)

      const remainingMs = Math.max(0, endMs - nowMs)
      const hours = Math.floor(remainingMs / 3600000)
      const mins = Math.floor((remainingMs % 3600000) / 60000)
      setTimeRemaining(`${hours}h ${mins}m remaining`)
    }

    updateProgress()
    const interval = setInterval(updateProgress, 60000)

    return () => clearInterval(interval)
  }, [shift])

  const fetchShift = async () => {
    setLoading(true)
    try {
      const todayShift = await getTodayShift(crewMemberId)
      setShift(todayShift)

      if (todayShift?.id) {
        const shiftLocs = await getShiftLocations(todayShift.id)
        setLocations(shiftLocs)
      }
    } catch (err) {
      console.error('Error fetching shift:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="card mb-4 p-4 text-slate-500">Loading shift...</div>

  if (!shift) return null

  return (
    <div className="card mb-4 bg-gradient-to-br from-blue-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 border border-blue-200 dark:border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Today's Shift</h3>
          <div className="flex gap-2 mt-2">
            <span className={`px-3 py-1 rounded text-sm font-semibold ${
              shift.shift_type === 'day'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-gray-700 text-white'
            }`}>
              {shift.shift_type.toUpperCase()}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {shift.start_time} - {shift.end_time}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Shift Progress</span>
          <span className="text-slate-600 dark:text-slate-400">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-300 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-2">{timeRemaining}</div>
      </div>

      {/* Locations */}
      {locations && locations.length > 0 && (
        <div className="bg-white dark:bg-slate-700 p-3 rounded border border-slate-200 dark:border-slate-600">
          <div className="font-semibold text-sm mb-3 text-slate-800 dark:text-slate-100">
            <MapPin size={16} className="inline mr-1" />
            Locations ({locations.length})
          </div>
          <div className="space-y-2">
            {locations.map((loc, idx) => (
              <div key={loc.id} className="text-sm py-1">
                <div className="font-semibold text-slate-800 dark:text-slate-100">{idx + 1}. {loc.location_name}</div>
                {loc.address && <div className="text-xs text-slate-600 dark:text-slate-400">{loc.address}</div>}
                {loc.start_time && (
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {loc.start_time} - {loc.end_time}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {shift.notes && (
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-3 italic">
          <Clock size={14} className="inline mr-1" />
          Notes: {shift.notes}
        </div>
      )}
    </div>
  )
}
