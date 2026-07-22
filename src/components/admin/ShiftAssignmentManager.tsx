import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, ChevronDown } from 'lucide-react'
import { getUpcomingShifts, getShiftAssignments, getAllCrewMembers, assignCrewToShift, removeCrewFromShift } from '../../services/supabase'
import type { ShiftData, ShiftAssignmentData, CrewMemberData } from '../../services/supabase'

interface Props {
  crewMemberId?: number
}

export function ShiftAssignmentManager({ crewMemberId }: Props) {
  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [assignments, setAssignments] = useState<Record<string, ShiftAssignmentData[]>>({})
  const [crews, setCrews] = useState<CrewMemberData[]>([])
  const [expandedShift, setExpandedShift] = useState<string | null>(null)
  const [selectedCrewForShift, setSelectedCrewForShift] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [shiftsData, crewsData] = await Promise.all([
        getUpcomingShifts(1, 7), // dummy crewMemberId, will fetch all shifts
        getAllCrewMembers(),
      ])

      setShifts(shiftsData)
      setCrews(crewsData)

      // Fetch assignments for each shift
      const assignmentsMap: Record<string, ShiftAssignmentData[]> = {}
      for (const shift of shiftsData) {
        if (shift.id) {
          const shiftAssignments = await getShiftAssignments(shift.id)
          assignmentsMap[shift.id] = shiftAssignments
        }
      }
      setAssignments(assignmentsMap)
    } catch (err) {
      console.error('Error fetching shift data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignCrew = async (shiftId: string, selectedCrewId: number) => {
    if (!selectedCrewId) return

    try {
      const shift = shifts.find(s => s.id === shiftId)
      if (!shift?.scheduled_date) return

      const result = await assignCrewToShift(selectedCrewId, shiftId, shift.scheduled_date)
      if (result) {
        // Refresh assignments
        const shiftAssignments = await getShiftAssignments(shiftId)
        setAssignments(prev => ({ ...prev, [shiftId]: shiftAssignments }))
        setSelectedCrewForShift(prev => ({ ...prev, [shiftId]: null }))
      }
    } catch (err) {
      console.error('Error assigning crew:', err)
    }
  }

  const handleRemoveCrew = async (assignmentId: string, shiftId: string) => {
    try {
      const success = await removeCrewFromShift(assignmentId)
      if (success) {
        const shiftAssignments = await getShiftAssignments(shiftId)
        setAssignments(prev => ({ ...prev, [shiftId]: shiftAssignments }))
      }
    } catch (err) {
      console.error('Error removing crew:', err)
    }
  }

  if (loading) {
    return <div className="text-slate-500 text-sm p-4">Loading shifts...</div>
  }

  if (shifts.length === 0) {
    return <div className="text-slate-500 text-sm p-4">No shifts created yet. Create one to get started.</div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-3">
      <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-sm">Assign Crew to Shifts</h3>

      {shifts.map(shift => {
        const shiftId = shift.id
        if (!shiftId) return null

        const shiftAssignments = assignments[shiftId] || []
        const isExpanded = expandedShift === shiftId

        return (
          <motion.div
            key={shiftId}
            className="bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden"
          >
            <button
              onClick={() => setExpandedShift(isExpanded ? null : shiftId)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="text-left">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  {shift.scheduled_date} • {shift.start_time}-{shift.end_time}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {shiftAssignments.length} crew assigned
                </p>
              </div>
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={18} className="text-slate-400" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-slate-200 dark:border-slate-600 p-3 space-y-2 bg-white dark:bg-slate-800"
                >
                  {/* Assigned crew */}
                  {shiftAssignments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Assigned Crew:</p>
                      <div className="space-y-1">
                        {shiftAssignments.map(assignment => {
                          const crew = crews.find(c => c.id === assignment.crew_member_id)
                          return (
                            <div key={assignment.id} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-700 rounded">
                              <span className="text-sm text-slate-800 dark:text-slate-200">
                                {crew?.firstName} {crew?.lastName}
                              </span>
                              <button
                                onClick={() => assignment.id && handleRemoveCrew(assignment.id, shift.id!)}
                                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Remove crew"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add crew */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
                    <div className="flex gap-2">
                      <select
                        value={selectedCrewForShift[shiftId] ?? ''}
                        onChange={(e) => setSelectedCrewForShift(prev => ({ ...prev, [shiftId]: Number(e.target.value) }))}
                        className="flex-1 text-sm p-2 border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="">Select crew member...</option>
                        {crews
                          .filter(c => !shiftAssignments.find(a => a.crew_member_id === c.id))
                          .map(crew => (
                            <option key={crew.id} value={crew.id}>
                              {crew.firstName} {crew.lastName}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleAssignCrew(shiftId, selectedCrewForShift[shiftId] || 0)}
                        disabled={!selectedCrewForShift[shiftId]}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm font-semibold transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
