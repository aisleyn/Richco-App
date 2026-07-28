import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, CheckCircle, ChevronDown, AlertCircle, MapPin } from 'lucide-react'
import { jobSites, mockVehicles } from '../../data/mockData'
import { useAppStore } from '../../store/appStore'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useElapsedTime, formatElapsed, msToDecimalHours } from '../../hooks/useTimer'
import { addPhotos } from '../../services/photoDatabase'
import type { Photo } from '../../types'

interface Props {
  onClose: () => void
  onConfirm: () => void
}

export function ClockOutModal({ onClose, onConfirm }: Props) {
  const { clockInTime, clockedIn, breakActive, breakStartTime, totalBreakMs, currentShiftIsOvernight, clockOut } = useAppStore()
  const { requestLocation, isLoading: isGeoLoading } = useGeolocation()
  const elapsed = useElapsedTime(clockedIn ? clockInTime : null, breakActive, breakStartTime, totalBreakMs)

  const [siteId, setSiteId] = useState(jobSites[0].id)
  const [vehicleUsed, setVehicleUsed] = useState<'no' | 'yes'>('no')
  const [vehicleId, setVehicleId] = useState('')
  const [breakTaken, setBreakTaken] = useState<'yes' | 'no' | ''>('')
  const [concerns, setConcerns] = useState('')
  const [summary, setSummary] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [clockOutGps, setClockOutGps] = useState(false)

  // Mandatory break depends on shift type
  const mandatoryBreakHours = currentShiftIsOvernight ? 0.5 : 1.0 // -0.5h overnight, -1h day shift

  // Calculate hours
  const rawHours = msToDecimalHours(elapsed) // Work time without breaks
  const breakHours = msToDecimalHours(totalBreakMs) // Actual break time taken
  const paidHours = Math.max(0, rawHours - mandatoryBreakHours) // Subtract mandatory break
  const regularHours = Math.min(paidHours, 8)
  const overtimeHours = Math.max(0, paidHours - 8)

  function validate() {
    const e: Record<string, string> = {}
    if (!siteId) e.site = 'Please select a site'
    if (vehicleUsed === 'yes' && !vehicleId) e.vehicle = 'Please select the vehicle used'
    if (!breakTaken) e.break = 'Please confirm break status'
    if (!summary.trim()) e.summary = 'Please enter a shift summary'
    if (photos.length === 0) e.photos = 'At least one photo is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setClockOutGps(true)

    // Request GPS for clock out
    const gpsOut = await requestLocation()

    // Get current project info from store
    const { currentProjectId, currentProjectName, currentUserEmail, currentUserName, currentUserId } = useAppStore.getState()
    const site = jobSites.find(s => s.id === siteId)

    // Save photos to database with projectId
    if (photos.length > 0 && currentProjectId) {
      const photoObjects: Photo[] = photos.map((url, idx) => ({
        id: `photo-${Date.now()}-${idx}`,
        url,
        thumbnailUrl: url,
        siteId,
        siteName: site?.name || '',
        projectId: currentProjectId,
        projectName: currentProjectName,
        submittedBy: currentUserName,
        submittedById: currentUserId,
        timestamp: Date.now(),
        category: 'Site Conditions',
      }))
      try {
        await addPhotos(photoObjects, currentUserEmail)
        console.log('[ClockOut] Saved', photos.length, 'photos with projectId:', currentProjectId)
      } catch (err) {
        console.error('[ClockOut] Failed to save photos:', err)
      }
    }

    await clockOut({
      clockOutTime: Date.now(),
      siteId,
      vehicleUsed: vehicleId,
      breakTaken: breakTaken === 'yes',
      concerns,
      shiftSummary: summary,
      photos,
      gpsOut: gpsOut || undefined,
    })
    setSubmitted(true)
    setTimeout(onConfirm, 1800)
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(f => {
      const url = URL.createObjectURL(f)
      setPhotos(prev => [...prev, url])
    })
    setErrors(prev => ({ ...prev, photos: '' }))
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 p-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
          >
            <CheckCircle size={72} className="text-emerald-400" />
          </motion.div>
          <p className="text-slate-800 text-xl font-semibold">Clocked Out</p>
          <p className="text-slate-400 text-sm">{paidHours.toFixed(2)} hours recorded</p>
        </motion.div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end p-4">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-bg-base w-full max-h-[92vh] rounded-3xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-200 shrink-0">
            <div>
              <h2 className="text-slate-800 font-bold text-lg">Clock Out</h2>
              <p className="text-slate-400 text-sm">Complete before clocking out</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-bg-elevated flex items-center justify-center">
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Time summary banner */}
          <div className="mx-5 mt-4 bg-bg-surface rounded-xl p-4 space-y-3 shrink-0">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-slate-800 font-mono text-2xl font-bold">{formatElapsed(elapsed)}</p>
                <p className="text-slate-500 text-xs mt-0.5">Work Time</p>
              </div>
              <div className="text-center border-x border-slate-200">
                <p className="text-emerald-400 font-semibold text-2xl font-bold">{regularHours.toFixed(2)}h</p>
                <p className="text-slate-500 text-xs mt-0.5">Regular</p>
              </div>
              <div className="text-center">
                <p className={`font-bold text-2xl ${overtimeHours > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{overtimeHours.toFixed(2)}h</p>
                <p className="text-slate-500 text-xs mt-0.5">Overtime</p>
              </div>
            </div>
            <div className="text-center text-xs border-t border-slate-200 pt-2">
              <p className="text-slate-700 dark:text-slate-300 font-medium">Raw: {rawHours.toFixed(2)}h | Breaks: {breakHours.toFixed(2)}h | Mandatory: -{mandatoryBreakHours.toFixed(1)}h ({currentShiftIsOvernight ? 'Overnight' : 'Day shift'})</p>
            </div>
          </div>

          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Site selector */}
            <div>
              <label className="text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider block mb-2">Site Worked</label>
              <div className="relative">
                <select
                  value={siteId}
                  onChange={e => { setSiteId(e.target.value); setErrors(p => ({ ...p, site: '' })) }}
                  className="w-full bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-slate-800 appearance-none text-sm"
                >
                  {jobSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {errors.site && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.site}</p>}
            </div>

            {/* Vehicle */}
            <div>
              <label className="text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider block mb-2">Company Vehicle Used?</label>
              <div className="flex gap-2 mb-2">
                {(['no', 'yes'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setVehicleUsed(v)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${vehicleUsed === v ? 'bg-blue-600 text-slate-900' : 'bg-bg-surface text-slate-400'}`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              {vehicleUsed === 'yes' && (
                <div className="relative">
                  <select
                    value={vehicleId}
                    onChange={e => { setVehicleId(e.target.value); setErrors(p => ({ ...p, vehicle: '' })) }}
                    className="w-full bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-slate-800 appearance-none text-sm"
                  >
                    <option value="">Select vehicle...</option>
                    {mockVehicles.map(v => <option key={v.id} value={v.id}>{v.name} – {v.plate}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              )}
              {errors.vehicle && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.vehicle}</p>}
            </div>

            {/* Break taken */}
            <div>
              <label className="text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider block mb-2">Mandatory Break Taken?</label>
              <div className="flex gap-2">
                {(['yes', 'no'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setBreakTaken(v); setErrors(p => ({ ...p, break: '' })) }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${breakTaken === v ? (v === 'yes' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40') : 'bg-bg-surface text-slate-400 border border-transparent'}`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              {errors.break && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.break}</p>}
            </div>

            {/* Issues */}
            <div>
              <label className="text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider block mb-2">Issues or Concerns <span className="text-slate-600 font-normal">(Optional)</span></label>
              <textarea
                value={concerns}
                onChange={e => setConcerns(e.target.value)}
                placeholder="Any safety issues, equipment problems, or incidents to report..."
                rows={3}
                className="w-full bg-bg-surface border border-white/10 rounded-xl px-4 py-3 text-slate-800 text-sm resize-none placeholder:text-slate-600"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider block mb-2">Shift Summary <span className="text-red-400">*</span></label>
              <textarea
                value={summary}
                onChange={e => { setSummary(e.target.value); setErrors(p => ({ ...p, summary: '' })) }}
                placeholder="Describe work completed today..."
                rows={4}
                className={`w-full bg-bg-surface border rounded-xl px-4 py-3 text-slate-800 text-sm resize-none placeholder:text-slate-600 ${errors.summary ? 'border-red-500/50' : 'border-white/10'}`}
              />
              {errors.summary && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.summary}</p>}
            </div>

            {/* Photos */}
            <div>
              <label className="text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider block mb-2">
                Site Photos <span className="text-red-400">*</span>
                <span className="text-slate-600 font-normal ml-2">Min. 1 required</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={handlePhoto} className="hidden" />

              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                  {photos.map((url, i) => (
                    <div key={i} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                      >
                        <X size={10} className="text-slate-800" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => fileRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed rounded-xl text-sm font-medium transition-colors ${errors.photos ? 'border-red-500/50 text-red-400' : 'border-white/10 text-slate-400 active:border-blue-600/50 active:text-blue-600'}`}
              >
                <Camera size={16} />
                {photos.length === 0 ? 'Add Photo' : 'Add Another Photo'}
              </button>
              {errors.photos && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.photos}</p>}
            </div>

            <div className="h-2" />
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-200 shrink-0">
            {clockOutGps && isGeoLoading && (
              <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
                <MapPin size={14} className="text-blue-400 animate-pulse" />
                <p className="text-blue-400 text-xs">Capturing location...</p>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={isGeoLoading}
              className="w-full py-4 bg-red-500 active:bg-red-600 rounded-xl text-slate-800 font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeoLoading && clockOutGps ? 'Getting Location...' : 'Finalize Clock Out'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
