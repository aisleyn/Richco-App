import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createShift, getAllCrewMembers } from '../../services/supabase'
import { supabase } from '../../services/supabaseAuth'
import type { ShiftLocationData, CrewMemberData } from '../../services/supabase'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateShiftForm({ isOpen, onClose, onSuccess }: Props) {
  const [crews, setCrews] = useState<CrewMemberData[]>([])
  const [crewMemberId, setCrewMemberId] = useState<number | null>(null)
  const [scheduledDate, setScheduledDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [shiftType, setShiftType] = useState<'day' | 'night'>('day')
  const [locations, setLocations] = useState<(ShiftLocationData & { _temp_id: string })[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCrews()

      // Subscribe to real-time crew member changes (deletions, additions, updates)
      const subscription = supabase
        .channel('shift_form_crew_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'crew_members' },
          (payload) => {
            console.log('[CreateShiftForm] Crew member change detected:', payload.eventType)
            // Reload crew list on any change
            loadCrews()
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[CreateShiftForm] Real-time subscribed to crew changes')
          }
        })

      return () => {
        supabase.removeChannel(subscription)
      }
    }
  }, [isOpen])

  const loadCrews = async () => {
    try {
      const crewList = await getAllCrewMembers()
      console.log('[CreateShiftForm] Loaded crew members:', crewList.length)
      setCrews(crewList)
    } catch (err) {
      console.error('[CreateShiftForm] Error loading crews:', err)
      setError('Failed to load crew members')
    }
  }

  const handleAddLocation = () => {
    const newLocation: ShiftLocationData & { _temp_id: string } = {
      _temp_id: Date.now().toString(),
      id: '',
      shift_id: '',
      sequence_order: locations.length + 1,
      location_name: '',
    }
    setLocations([...locations, newLocation])
  }

  const handleLocationChange = (idx: number, field: string, value: any) => {
    const updated = [...locations]
    updated[idx] = { ...updated[idx], [field]: value }
    setLocations(updated)
  }

  const handleRemoveLocation = (idx: number) => {
    setLocations(locations.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!crewMemberId || !scheduledDate || !startTime || !endTime) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const cleanLocations = locations
        .filter(l => l.location_name)
        .map(({ _temp_id, ...l }) => l)

      const result = await createShift(
        {
          crew_member_id: crewMemberId,
          scheduled_date: scheduledDate,
          start_time: startTime,
          end_time: endTime,
          shift_type: shiftType,
          notes: notes || undefined,
          status: 'scheduled',
        },
        cleanLocations
      )

      if (result) {
        setCrewMemberId(null)
        setScheduledDate('')
        setStartTime('09:00')
        setEndTime('17:00')
        setShiftType('day')
        setLocations([])
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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Shift</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Crew Member Select */}
          <div>
            <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-200">
              Crew Member *
            </label>
            <select
              value={crewMemberId ?? ''}
              onChange={(e) => setCrewMemberId(Number(e.target.value))}
              className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              required
            >
              <option value="">Select crew member...</option>
              {crews.map(crew => (
                <option key={crew.id} value={crew.id}>
                  {crew.firstName} {crew.lastName} ({crew.email})
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-200">
              Scheduled Date *
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div>
              <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-200">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-200">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Shift Type */}
          <div>
            <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-200">
              Shift Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="day"
                  checked={shiftType === 'day'}
                  onChange={(e) => setShiftType(e.target.value as 'day' | 'night')}
                  className="w-4 h-4"
                />
                <span className="text-slate-700 dark:text-slate-200">Day</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="night"
                  checked={shiftType === 'night'}
                  onChange={(e) => setShiftType(e.target.value as 'day' | 'night')}
                  className="w-4 h-4"
                />
                <span className="text-slate-700 dark:text-slate-200">Night</span>
              </label>
            </div>
          </div>

          {/* Locations */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Locations</label>
              <button
                type="button"
                onClick={handleAddLocation}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center gap-1"
              >
                <Plus size={16} /> Add Location
              </button>
            </div>

            {locations.map((loc, idx) => (
              <div key={loc._temp_id} className="border border-slate-300 dark:border-slate-600 rounded p-3 mb-2 space-y-2">
                <input
                  type="text"
                  placeholder="Location name *"
                  value={loc.location_name}
                  onChange={(e) => handleLocationChange(idx, 'location_name', e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={loc.address || ''}
                  onChange={(e) => handleLocationChange(idx, 'address', e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    placeholder="Start time"
                    value={loc.start_time || ''}
                    onChange={(e) => handleLocationChange(idx, 'start_time', e.target.value)}
                    className="border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                  <input
                    type="time"
                    placeholder="End time"
                    value={loc.end_time || ''}
                    onChange={(e) => handleLocationChange(idx, 'end_time', e.target.value)}
                    className="border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLocation(idx)}
                  className="text-sm bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded flex items-center gap-1"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-200">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this shift"
              className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-600">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold"
            >
              {loading ? 'Creating...' : 'Create Shift'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
