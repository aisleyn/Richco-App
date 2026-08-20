import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Check } from 'lucide-react'
import { createShift, getAllCrewMembers, getProjects, assignCrewToShift } from '../../services/supabase'
import { postNotification } from '../../services/notificationService'
import { notifyShiftAssignment } from '../../services/shiftNotifications'
import { supabase } from '../../services/supabaseAuth'
import { useAppStore } from '../../store/appStore'
import type { ShiftLocationData, CrewMemberData, Project } from '../../services/supabase'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface FormLocation extends ShiftLocationData {
  _temp_id: string
}

export function CreateShiftFormV2({ isOpen, onClose, onSuccess }: Props) {
  const { currentUserName } = useAppStore()
  const [crews, setCrews] = useState<CrewMemberData[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedCrews, setSelectedCrews] = useState<Set<number>>(new Set())

  const [scheduledDate, setScheduledDate] = useState('')
  const [startHour, setStartHour] = useState('09')
  const [startMinute, setStartMinute] = useState('00')
  const [endHour, setEndHour] = useState('17')
  const [endMinute, setEndMinute] = useState('00')
  const [shiftType, setShiftType] = useState<'day' | 'night'>('day')
  const [projectId, setProjectId] = useState<string>('')
  const [parkOpenHour, setParkOpenHour] = useState('08')
  const [parkOpenMinute, setParkOpenMinute] = useState('00')
  const [parkCloseHour, setParkCloseHour] = useState('18')
  const [parkCloseMinute, setParkCloseMinute] = useState('00')

  const [locations, setLocations] = useState<FormLocation[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()

      // Subscribe to real-time crew member changes
      const subscription = supabase
        .channel('shift_form_v2_crew_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'crew_members' },
          (payload) => {
            console.log('[CreateShiftFormV2] Crew change detected:', payload.eventType)
            loadData()
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[CreateShiftFormV2] Real-time subscribed to crew changes')
          }
        })

      return () => {
        supabase.removeChannel(subscription)
      }
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [crewsData, projectsData] = await Promise.all([
        getAllCrewMembers(),
        getProjects(),
      ])
      console.log('[CreateShiftFormV2] Loaded crew members:', crewsData.length)
      setCrews(crewsData)
      setProjects(projectsData)
    } catch (err) {
      console.error('[CreateShiftFormV2] Error loading data:', err)
      setError('Failed to load data')
    }
  }

  const toggleCrewSelection = (crewId: number) => {
    const newSelected = new Set(selectedCrews)
    if (newSelected.has(crewId)) {
      newSelected.delete(crewId)
    } else {
      newSelected.add(crewId)
    }
    setSelectedCrews(newSelected)
  }

  const handleAddLocation = () => {
    if (!locationInput.trim()) return

    const newLocation: FormLocation = {
      _temp_id: Date.now().toString(),
      id: '',
      shift_id: '',
      sequence_order: locations.length + 1,
      location_name: locationInput,
      address: locationInput,
    }
    setLocations([...locations, newLocation])
    setLocationInput('')
  }

  const handleRemoveLocation = (idx: number) => {
    setLocations(locations.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!scheduledDate || selectedCrews.size === 0) {
      setError('Please select date and at least one crew member')
      return
    }

    setLoading(true)
    try {
      const startTime = `${startHour}:${startMinute}`
      const endTime = `${endHour}:${endMinute}`
      const parkOpenTime = `${parkOpenHour}:${parkOpenMinute}`
      const parkCloseTime = `${parkCloseHour}:${parkCloseMinute}`

      const cleanLocations = locations
        .filter(l => l.location_name)
        .map(({ _temp_id, ...l }) => l)

      const result = await createShift(
        {
          crew_member_id: Array.from(selectedCrews)[0], // Use first selected crew as primary (we'll handle multiple assignments)
          scheduled_date: scheduledDate,
          start_time: startTime,
          end_time: endTime,
          shift_type: shiftType,
          notes: notes || undefined,
          status: 'scheduled',
          project_id: projectId || undefined,
          park_opening_hour: parkOpenTime,
          park_closing_hour: parkCloseTime,
        },
        cleanLocations
      )

      if (result?.id) {
        // Assign all selected crews to this shift and send notifications
        for (const crewId of selectedCrews) {
          await assignCrewToShift(crewId, result.id, scheduledDate)

          // Find crew member details for notification
          const crewMember = crews.find(c => c.id === crewId)
          if (crewMember) {
            const crewName = `${crewMember.firstName} ${crewMember.lastName}`
            const shiftDate = new Date(scheduledDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
            const shiftTime = `${startHour}:${startMinute} - ${endHour}:${endMinute}`
            const notificationTitle = `Shift Assignment: ${shiftDate}`
            const notificationMessage = `You have been scheduled for a ${shiftType} shift on ${shiftDate} from ${shiftTime}${notes ? `. ${notes}` : ''}`

            try {
              // Send local notification
              await postNotification(
                notificationTitle,
                notificationMessage,
                currentUserName || 'Admin',
                'update'
              )
              console.log(`[CreateShiftFormV2] Notified ${crewName} of shift assignment (local)`)

              // Send push notification
              await notifyShiftAssignment({
                userEmail: crewMember.email,
                shiftName: `${shiftType} Shift`,
                date: shiftDate,
                startTime: shiftTime,
              })
              console.log(`[CreateShiftFormV2] Sent push notification to ${crewName}`)
            } catch (err) {
              console.error(`[CreateShiftFormV2] Failed to notify ${crewName}:`, err)
            }
          }
        }

        // Reset form
        setScheduledDate('')
        setStartHour('09')
        setStartMinute('00')
        setEndHour('17')
        setEndMinute('00')
        setShiftType('day')
        setProjectId('')
        setParkOpenHour('08')
        setParkOpenMinute('00')
        setParkCloseHour('18')
        setParkCloseMinute('00')
        setLocations([])
        setSelectedCrews(new Set())
        setNotes('')

        onSuccess?.()
        onClose()
      } else {
        setError('Failed to create shift')
      }
    } catch (err) {
      console.error('Error creating shift:', err)
      setError('Failed to create shift')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-bg-base rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[95vh] overflow-y-auto border border-slate-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Create Shift</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-50 rounded"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-error-light border border-error-lighter rounded text-error-dark text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Scheduled Date */}
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                Scheduled Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
                required
              />
            </div>

            {/* Shift Type */}
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                Shift Type
              </label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="day"
                    checked={shiftType === 'day'}
                    onChange={(e) => setShiftType(e.target.value as 'day' | 'night')}
                    className="w-4 h-4"
                  />
                  <span className="text-primary">Day</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="night"
                    checked={shiftType === 'night'}
                    onChange={(e) => setShiftType(e.target.value as 'day' | 'night')}
                    className="w-4 h-4"
                  />
                  <span className="text-primary">Night</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                Start Hour
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value.padStart(2, '0'))}
                className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                Start Minute
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={startMinute}
                onChange={(e) => setStartMinute(e.target.value.padStart(2, '0'))}
                className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                End Hour
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value.padStart(2, '0'))}
                className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                End Minute
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={endMinute}
                onChange={(e) => setEndMinute(e.target.value.padStart(2, '0'))}
                className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
              />
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="block font-semibold mb-2 text-primary text-sm">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
            >
              <option value="">Select project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                Park Open Hour
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={parkOpenHour}
                onChange={(e) => setParkOpenHour(e.target.value.padStart(2, '0'))}
                className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                Open Minute
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={parkOpenMinute}
                onChange={(e) => setParkOpenMinute(e.target.value.padStart(2, '0'))}
                className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                Park Close Hour
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={parkCloseHour}
                onChange={(e) => setParkCloseHour(e.target.value.padStart(2, '0'))}
                className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2 text-primary text-sm">
                Close Minute
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={parkCloseMinute}
                onChange={(e) => setParkCloseMinute(e.target.value.padStart(2, '0'))}
                className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary"
              />
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="block font-semibold mb-2 text-primary text-sm">
              Locations
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Enter address..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                className="flex-1 border border-slate-300 rounded p-2 bg-bg-base text-primary text-sm"
              />
              <button
                type="button"
                onClick={handleAddLocation}
                className="px-3 py-2 bg-primary-base hover:bg-primary-dark text-white rounded text-sm font-semibold"
              >
                <Plus size={16} />
              </button>
            </div>

            {locations.map((loc, idx) => (
              <div key={loc._temp_id} className="flex items-center justify-between p-2 bg-bg-surface rounded mb-1 border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-primary">{idx + 1}. {loc.location_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLocation(idx)}
                  className="p-1 text-error-base hover:bg-error-light rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Crew Selection */}
          <div>
            <label className="block font-semibold mb-2 text-primary text-sm">
              Assign Crew Members *
            </label>

            {/* Selected Crew Preview */}
            {selectedCrews.size > 0 && (
              <div className="mb-3 p-3 bg-primary-base/10 rounded border border-primary-base/30">
                <p className="text-xs font-semibold text-primary-base mb-2">
                  Selected: {selectedCrews.size}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedCrews).map(crewId => {
                    const crew = crews.find(c => c.id === crewId)
                    return crew ? (
                      <div key={crewId} className="bg-primary-base text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        {crew.firstName} {crew.lastName}
                        <button
                          type="button"
                          onClick={() => toggleCrewSelection(crewId)}
                          className="ml-1 hover:bg-primary-dark rounded"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            )}

            {/* Checkbox List */}
            <div className="border border-slate-300 rounded max-h-48 overflow-y-auto">
              {crews.map(crew => (
                <label
                  key={crew.id}
                  className="flex items-center gap-3 p-3 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCrews.has(crew.id as number)}
                    onChange={() => toggleCrewSelection(crew.id as number)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="flex-1 text-primary">
                    {crew.firstName} {crew.lastName}
                  </span>
                  {selectedCrews.has(crew.id as number) && (
                    <Check size={16} className="text-primary-base" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold mb-2 text-primary text-sm">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full border border-slate-300 rounded p-2 bg-bg-base text-primary text-sm"
              rows={2}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t border-border-light">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-amber-500 disabled:opacity-50 text-slate-900 px-4 py-2 rounded font-semibold"
            >
              {loading ? 'Creating...' : 'Create Shift'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg-surface border border-slate-300 hover:bg-slate-50 text-slate-800 px-4 py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
