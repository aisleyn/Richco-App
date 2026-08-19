import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Trash2, Plus, Check } from 'lucide-react'
import { getUpcomingShifts, getShiftAssignments, getAllCrewMembers, assignCrewToShift, removeCrewFromShift } from '../../services/supabase'
import { supabase } from '../../services/supabaseAuth'
import type { ShiftData, ShiftAssignmentData, CrewMemberData } from '../../services/supabase'

export function ShiftAssignmentManagerV2() {
  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [assignments, setAssignments] = useState<Record<string, ShiftAssignmentData[]>>({})
  const [crews, setCrews] = useState<CrewMemberData[]>([])
  const [expandedShift, setExpandedShift] = useState<string | null>(null)
  const [selectedCrewsForShift, setSelectedCrewsForShift] = useState<Record<string, Set<number>>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()

    // Subscribe to real-time crew member changes
    const subscription = supabase
      .channel('shift_assignment_crew_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'crew_members' },
        (payload) => {
          console.log('[ShiftAssignmentManagerV2] Crew change detected:', payload.eventType)
          // Just reload crews - shifts will be refreshed too
          fetchData()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ShiftAssignmentManagerV2] Real-time subscribed to crew changes')
        }
      })

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [shiftsData, crewsData] = await Promise.all([
        getUpcomingShifts(1, 7),
        getAllCrewMembers(),
      ])

      setShifts(shiftsData)
      setCrews(crewsData)

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

  const toggleCrewForShift = (shiftId: string, crewId: number) => {
    setSelectedCrewsForShift(prev => {
      const current = prev[shiftId] || new Set()
      const newSet = new Set(current)
      if (newSet.has(crewId)) {
        newSet.delete(crewId)
      } else {
        newSet.add(crewId)
      }
      return { ...prev, [shiftId]: newSet }
    })
  }

  const handleAssignCrew = async (shiftId: string) => {
    const selected = selectedCrewsForShift[shiftId]
    if (!selected || selected.size === 0) return

    try {
      const shift = shifts.find(s => s.id === shiftId)
      if (!shift?.scheduled_date) return

      for (const crewId of selected) {
        await assignCrewToShift(crewId, shiftId, shift.scheduled_date)
      }

      const shiftAssignments = await getShiftAssignments(shiftId)
      setAssignments(prev => ({ ...prev, [shiftId]: shiftAssignments }))
      setSelectedCrewsForShift(prev => ({ ...prev, [shiftId]: new Set() }))
    } catch (err) {
      console.error('Error assigning crew:', err)
    }
  }

  const handleRemoveCrew = async (assignmentId: string, shiftId: string) => {
    try {
      await removeCrewFromShift(assignmentId)
      const shiftAssignments = await getShiftAssignments(shiftId)
      setAssignments(prev => ({ ...prev, [shiftId]: shiftAssignments }))
    } catch (err) {
      console.error('Error removing crew:', err)
    }
  }

  if (loading) {
    return <div className="text-slate-500 text-sm p-4">Loading shifts...</div>
  }

  if (shifts.length === 0) {
    return null
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-3">
      <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-sm">Manage Crew Assignments</h3>

      {shifts.map(shift => {
        const shiftId = shift.id
        if (!shiftId) return null

        const shiftAssignments = assignments[shiftId] || []
        const selectedForThisShift = selectedCrewsForShift[shiftId] || new Set()
        const isExpanded = expandedShift === shiftId
        const availableCrew = crews.filter(c => !shiftAssignments.find(a => a.crew_member_id === c.id))

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
                  {shiftAssignments.length} assigned {availableCrew.length > 0 ? `• ${availableCrew.length} available` : ''}
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
                  className="border-t border-slate-200 dark:border-slate-600 p-3 space-y-3 bg-white dark:bg-slate-800"
                >
                  {/* Assigned Crew */}
                  {shiftAssignments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                        Assigned Crew ({shiftAssignments.length}):
                      </p>
                      <div className="space-y-1">
                        {shiftAssignments.map(assignment => {
                          const crew = crews.find(c => c.id === assignment.crew_member_id)
                          return (
                            <div key={assignment.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2">
                                <Check size={14} className="text-green-600" />
                                <span className="text-sm text-slate-800 dark:text-slate-200">
                                  {crew?.firstName} {crew?.lastName}
                                </span>
                              </div>
                              <button
                                onClick={() => assignment.id && handleRemoveCrew(assignment.id, shiftId)}
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

                  {/* Selected Preview */}
                  {selectedForThisShift.size > 0 && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                        Ready to Assign ({selectedForThisShift.size}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(selectedForThisShift).map(crewId => {
                          const crew = crews.find(c => c.id === crewId)
                          return crew ? (
                            <span key={crewId} className="bg-green-600 text-white text-xs px-2 py-1 rounded font-semibold">
                              {crew.firstName} {crew.lastName}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  {/* Available Crew Checkboxes */}
                  {availableCrew.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                        Available Crew:
                      </p>
                      <div className="border border-slate-300 dark:border-slate-500 rounded max-h-40 overflow-y-auto">
                        {availableCrew.map(crew => (
                          <label
                            key={crew.id}
                            className="flex items-center gap-3 p-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedForThisShift.has(crew.id as number)}
                              onChange={() => toggleCrewForShift(shiftId, crew.id as number)}
                              className="w-4 h-4 rounded"
                            />
                            <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">
                              {crew.firstName} {crew.lastName}
                            </span>
                          </label>
                        ))}
                      </div>

                      {selectedForThisShift.size > 0 && (
                        <button
                          onClick={() => handleAssignCrew(shiftId)}
                          className="mt-2 w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={14} /> Assign Selected
                        </button>
                      )}
                    </div>
                  )}

                  {availableCrew.length === 0 && selectedForThisShift.size === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">All available crew already assigned</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
