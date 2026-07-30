import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Play, Pause, Square, ChevronDown } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useElapsedTime, formatElapsed } from '../../hooks/useTimer'
import { getCrewShiftAssignment, getCrewMemberByEmail } from '../../services/supabase'
import type { ShiftData, ShiftLocationData } from '../../services/supabase'

interface Props {
  onClockIn: (isOvernight: boolean, siteId?: string, siteName?: string) => void
  onClockOut: () => void
  onNavigateTime: () => void
  isOvernightShift?: boolean
}

export function ClockInCard({ onClockIn, onClockOut, onNavigateTime, isOvernightShift = false }: Props) {
  const { clockedIn, clockInTime, breakActive, breakStartTime, totalBreakMs, startBreak, endBreak, currentUserEmail } = useAppStore()
  const elapsed = useElapsedTime(clockedIn ? clockInTime : null, breakActive, breakStartTime, totalBreakMs)
  const [assignedShift, setAssignedShift] = useState<(ShiftData & { locations: ShiftLocationData[] }) | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<ShiftLocationData | null>(null)
  const [locationsExpanded, setLocationsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAssignedShift()
  }, [currentUserEmail])

  const fetchAssignedShift = async () => {
    setLoading(true)
    try {
      const crew = await getCrewMemberByEmail(currentUserEmail)
      if (crew?.id) {
        const today = new Date().toISOString().split('T')[0]
        const shift = await getCrewShiftAssignment(crew.id as number, today)
        setAssignedShift(shift)

        if (shift?.locations && shift.locations.length > 0) {
          setSelectedLocation(shift.locations[0])
        }
      }
    } catch (err) {
      console.error('Error fetching assigned shift:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClockIn = () => {
    if (assignedShift && selectedLocation) {
      onClockIn(isOvernightShift, selectedLocation.location_name, selectedLocation.location_name)
    } else {
      onClockIn(isOvernightShift, 'shift', 'Shift')
    }
  }

  if (clockedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-success-base/35 shadow-success-glow overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0d3b2d, #0F1419)' }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-accent-cyan"
              />
              <span className="text-accent-cyan text-sm font-bold">Clocked In</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-2xl md:text-3xl font-light font-mono tracking-widest">
                {formatElapsed(elapsed)}
              </p>
              {breakActive && (
                <p className="text-warning-base text-xs mt-1 flex items-center gap-1">
                  <Pause size={10} /> On Break
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-white text-sm font-semibold">{selectedLocation?.location_name ?? 'Shift'}</p>
              {selectedLocation?.address && (
                <p className="text-white/70 text-xs flex items-center gap-1 justify-end">
                  <MapPin size={10} /> {selectedLocation.address}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex border-t border-white/10">
          <button
            onClick={breakActive ? endBreak : startBreak}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-warning-base text-sm font-medium active:bg-white/5 transition-colors"
          >
            {breakActive ? <Play size={14} /> : <Pause size={14} />}
            {breakActive ? 'End Break' : 'Break'}
          </button>
          <div className="w-px bg-white/5" />
          <button
            onClick={onClockOut}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-error-base text-sm font-medium active:bg-white/5 transition-colors"
          >
            <Square size={14} fill="currentColor" />
            Clock Out
          </button>
        </div>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-2xl border border-border-light overflow-hidden p-4"
      >
        <div className="text-center py-8 text-muted">Loading...</div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-2xl border border-border-light overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-muted text-xs uppercase tracking-wider font-medium mb-1">Shift</p>
            <p className="text-primary font-semibold">
              {selectedLocation?.location_name ?? 'Shift'}
            </p>
            {assignedShift && (
              <p className="text-secondary text-sm flex items-center gap-1 mt-0.5">
                <Clock size={12} />
                {assignedShift.start_time} – {assignedShift.end_time}
              </p>
            )}
          </div>
          <div className="bg-primary-base/10 border border-primary-base/30 rounded-xl px-3 py-1.5">
            <p className="text-primary-base text-xs font-semibold">
              {assignedShift ? 'Scheduled' : 'No Shift'}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {assignedShift && assignedShift.locations && assignedShift.locations.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={() => setLocationsExpanded(!locationsExpanded)}
              className="w-full flex items-center gap-2 px-4 py-3 border-t border-border-light text-secondary hover:bg-elevated transition-colors group"
            >
              <motion.div animate={{ rotate: locationsExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={14} className="text-muted group-hover:text-secondary" />
              </motion.div>
              <span className="text-xs font-semibold">
                Shift Locations ({assignedShift.locations.length})
              </span>
            </button>

            <AnimatePresence>
              {locationsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-border-light"
                >
                  <div className="p-3 space-y-2 bg-elevated/30">
                    {assignedShift.locations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => {
                          setSelectedLocation(loc)
                          setLocationsExpanded(false)
                        }}
                        className={`w-full text-left p-2 rounded-lg border transition-colors ${
                          selectedLocation?.id === loc.id
                            ? 'bg-primary-base/10 border-primary-base/30'
                            : 'bg-surface border-border-light hover:bg-elevated'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-primary font-medium text-xs">
                              {loc.sequence_order}. {loc.location_name}
                            </p>
                            {loc.address && (
                              <p className="text-secondary text-xs flex items-center gap-1 mt-0.5">
                                <MapPin size={10} />
                                {loc.address}
                              </p>
                            )}
                            {loc.start_time && (
                              <p className="text-secondary text-xs flex items-center gap-1 mt-0.5">
                                <Clock size={10} />
                                {loc.start_time} – {loc.end_time}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleClockIn}
        className="w-full flex items-center justify-center gap-2 py-4 active:opacity-90 transition-opacity"
        style={{ backgroundColor: '#0D8A60' }}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Play size={18} fill="white" className="text-white ml-0.5" />
        </motion.div>
        <span className="text-white font-bold text-base">Clock In</span>
      </button>
    </motion.div>
  )
}
