import { useState, useRef, useEffect } from 'react'
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
  const { setIsModalOpen } = useAppStore()

  useEffect(() => {
    setIsModalOpen(true)
    return () => setIsModalOpen(false)
  }, [])
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
            <CheckCircle size={72} className="text-success-base" />
          </motion.div>
          <p className="text-primary text-xl font-semibold">Clocked Out</p>
          <p className="text-secondary text-sm">{paidHours.toFixed(2)} hours recorded</p>
        </motion.div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 md:pointer-events-none">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-white dark:bg-slate-800 w-full max-w-md md:max-w-sm max-h-[90vh] rounded-2xl overflow-hidden flex flex-col md:pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-slate-700 shrink-0">
            <div>
              <h2 className="text-primary dark:text-slate-100 font-bold text-base">Clock Out</h2>
              <p className="text-secondary dark:text-slate-400 text-xs">Complete before clocking out</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              <X size={16} className="text-muted dark:text-slate-400" />
            </button>
          </div>

          {/* Time summary banner */}
          <div className="mx-4 mt-3 bg-white dark:bg-slate-700 rounded-lg p-3 space-y-2 shrink-0">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-primary font-mono text-xl font-bold">{formatElapsed(elapsed)}</p>
                <p className="text-secondary text-xs mt-0.5">Work Time</p>
              </div>
              <div className="text-center border-x border-border-light">
                <p className="text-success-base font-semibold text-xl font-bold">{regularHours.toFixed(2)}h</p>
                <p className="text-secondary text-xs mt-0.5">Regular</p>
              </div>
              <div className="text-center">
                <p className={`font-bold text-xl ${overtimeHours > 0 ? 'text-warning-base' : 'text-secondary'}`}>{overtimeHours.toFixed(2)}h</p>
                <p className="text-secondary text-xs mt-0.5">Overtime</p>
              </div>
            </div>
            <div className="text-center text-xs border-t border-border-light pt-1.5">
              <p className="text-primary font-medium">Raw: {rawHours.toFixed(2)}h | Breaks: {breakHours.toFixed(2)}h | Mandatory: -{mandatoryBreakHours.toFixed(1)}h ({currentShiftIsOvernight ? 'Overnight' : 'Day shift'})</p>
            </div>
          </div>

          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

            {/* Site selector */}
            <div>
              <label className="text-primary text-xs font-bold uppercase tracking-wider block mb-1.5">Site Worked</label>
              <div className="relative">
                <select
                  value={siteId}
                  onChange={e => { setSiteId(e.target.value); setErrors(p => ({ ...p, site: '' })) }}
                  className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-primary dark:text-slate-100 appearance-none text-sm"
                >
                  {jobSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
              {errors.site && <p className="text-error-base text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.site}</p>}
            </div>

            {/* Vehicle */}
            <div>
              <label className="text-primary text-xs font-bold uppercase tracking-wider block mb-1.5">Company Vehicle Used?</label>
              <div className="flex gap-2 mb-1.5 w-fit">
                {(['no', 'yes'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setVehicleUsed(v)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${vehicleUsed === v ? 'bg-primary-base text-white' : 'bg-white dark:bg-slate-700 text-muted dark:text-slate-400'}`}
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
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-primary dark:text-slate-100 appearance-none text-sm"
                  >
                    <option value="">Select vehicle...</option>
                    {mockVehicles.map(v => <option key={v.id} value={v.id}>{v.name} – {v.plate}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                </div>
              )}
              {errors.vehicle && <p className="text-error-base text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.vehicle}</p>}
            </div>

            {/* Break taken */}
            <div>
              <label className="text-primary text-xs font-bold uppercase tracking-wider block mb-1.5">Mandatory Break Taken?</label>
              <div className="flex gap-2 w-fit">
                {(['yes', 'no'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { setBreakTaken(v); setErrors(p => ({ ...p, break: '' })) }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${breakTaken === v ? (v === 'yes' ? 'bg-success-base/20 text-success-base border border-success-base/40' : 'bg-error-base/20 text-error-base border border-error-base/40') : 'bg-white dark:bg-slate-700 text-muted dark:text-slate-400 border border-transparent'}`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              {errors.break && <p className="text-error-base text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.break}</p>}
            </div>

            {/* Issues */}
            <div>
              <label className="text-primary text-xs font-bold uppercase tracking-wider block mb-1.5">Issues or Concerns <span className="text-muted font-normal">(Optional)</span></label>
              <textarea
                value={concerns}
                onChange={e => setConcerns(e.target.value)}
                placeholder="Any safety issues, equipment problems, or incidents to report..."
                rows={2}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-primary dark:text-slate-100 text-sm resize-none placeholder:text-muted dark:placeholder:text-slate-400"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="text-primary text-xs font-bold uppercase tracking-wider block mb-1.5">Shift Summary <span className="text-error-base">*</span></label>
              <textarea
                value={summary}
                onChange={e => { setSummary(e.target.value); setErrors(p => ({ ...p, summary: '' })) }}
                placeholder="Describe work completed today..."
                rows={3}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-3 py-2 text-primary dark:text-slate-100 text-sm resize-none placeholder:text-muted dark:placeholder:text-slate-400 ${errors.summary ? 'border-error-base/50' : 'border-slate-300 dark:border-slate-600'}`}
              />
              {errors.summary && <p className="text-error-base text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.summary}</p>}
            </div>

            {/* Photos */}
            <div>
              <label className="text-primary text-xs font-bold uppercase tracking-wider block mb-1.5">
                Site Photos <span className="text-error-base">*</span>
                <span className="text-muted font-normal ml-2">Min. 1 required</span>
              </label>
              <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={handlePhoto} className="hidden" />

              {photos.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-1.5">
                  {photos.map((url, i) => (
                    <div key={i} className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center"
                      >
                        <X size={9} className="text-primary" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => fileRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-lg text-sm font-medium transition-colors ${errors.photos ? 'border-error-base/50 text-error-base' : 'border-slate-300 dark:border-slate-600 text-muted dark:text-slate-400 active:border-primary-base/50 active:text-primary-base'}`}
              >
                <Camera size={14} />
                {photos.length === 0 ? 'Add Photo' : 'Add Another Photo'}
              </button>
              {errors.photos && <p className="text-error-base text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.photos}</p>}
            </div>

            <div className="h-1" />
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border-light dark:border-slate-700 shrink-0">
            {clockOutGps && isGeoLoading && (
              <div className="mb-2 p-2 bg-primary-base/10 border border-primary-base/30 rounded-lg flex items-center gap-2">
                <MapPin size={12} className="text-primary-base animate-pulse" />
                <p className="text-primary-base text-xs">Capturing location...</p>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={isGeoLoading}
              className="w-full py-3 bg-error-base active:bg-error-dark rounded-lg text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeoLoading && clockOutGps ? 'Getting Location...' : 'Finalize Clock Out'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
