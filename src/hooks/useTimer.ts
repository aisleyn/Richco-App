import { useState, useEffect } from 'react'

/**
 * Calculate elapsed work time, pausing during breaks
 * @param startMs Clock-in timestamp
 * @param breakActive Is user currently on break?
 * @param breakStartMs When did current break start?
 * @param totalBreakMs Total break time accumulated so far
 */
export function useElapsedTime(startMs: number | null, breakActive: boolean = false, breakStartMs: number | null = null, totalBreakMs: number = 0) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startMs) { setElapsed(0); return }

    const tick = () => {
      const now = Date.now()
      const totalElapsed = now - startMs

      // Calculate current break duration (if on break)
      let currentBreakDuration = totalBreakMs
      if (breakActive && breakStartMs) {
        currentBreakDuration = totalBreakMs + (now - breakStartMs)
      }

      // Work time = total elapsed - all break time
      const workElapsed = totalElapsed - currentBreakDuration
      setElapsed(Math.max(0, workElapsed))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startMs, breakActive, breakStartMs, totalBreakMs])

  return elapsed
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function msToDecimalHours(ms: number): number {
  return parseFloat((ms / 3600000).toFixed(2))
}

export function msToDecimalMinutes(ms: number): number {
  return parseFloat((ms / 60000).toFixed(0))
}
