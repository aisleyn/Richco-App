/**
 * Power Automate Integration Service
 *
 * Each function POSTs to a Power Automate HTTP trigger flow.
 * To wire up a flow:
 *   1. In Power Automate, create a new flow → trigger: "When an HTTP request is received"
 *   2. Copy the generated HTTP POST URL
 *   3. Paste it into your .env file as the matching VITE_ variable below
 *   4. The flow receives the JSON body and can write to Dataverse, SharePoint, Teams, etc.
 */

const FLOWS = {
  clockIn:     import.meta.env.VITE_PA_CLOCK_IN_URL     as string | undefined,
  clockOut:    import.meta.env.VITE_PA_CLOCK_OUT_URL    as string | undefined,
  photoUpload: import.meta.env.VITE_PA_PHOTO_URL        as string | undefined,
  alert:       import.meta.env.VITE_PA_ALERT_URL        as string | undefined,
  breakEvent:  import.meta.env.VITE_PA_BREAK_URL        as string | undefined,
}

async function postToFlow(url: string | undefined, body: Record<string, unknown>): Promise<boolean> {
  if (!url) {
    console.info('[PowerAutomate] No URL configured for this flow — skipping')
    return false
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch (err) {
    console.error('[PowerAutomate] Flow POST failed:', err)
    return false
  }
}

// ─── Clock In ──────────────────────────────────────────────────────────────
// Dataverse table: richco_timesheets
// Required columns: richco_employeeid, richco_clockintime, richco_siteid,
//                   richco_gpslat, richco_gpslng, richco_gpsaddress, richco_geofenceflag
export interface ClockInPayload {
  employeeId: string
  employeeName: string
  siteId: string
  siteName: string
  clockInTime: string          // ISO 8601
  gpsLat?: number
  gpsLng?: number
  gpsAddress?: string
  geofenceFlag: boolean        // true = clocked in outside expected radius
  scheduledStartTime: string
}

export function sendClockIn(payload: ClockInPayload) {
  return postToFlow(FLOWS.clockIn, payload as unknown as Record<string, unknown>)
}

// ─── Clock Out ─────────────────────────────────────────────────────────────
// Dataverse table: richco_timesheets (update existing record)
// Power BI dataset: Timesheets — feeds hours by employee, site, week, overtime
// Email report gets: raw work hours, minus mandatory 0.5h break, then regular/OT
export interface ClockOutPayload {
  employeeId: string
  employeeName: string
  timesheetId: string
  siteId: string
  siteName: string
  clockInTime: string
  clockOutTime: string
  totalHoursDecimal: number    // Raw work hours (excluding breaks taken) — e.g. 8.50
  breakHoursDecimal: number    // Actual break time taken — e.g. 0.50
  regularHours: number         // Paid hours (totalHours - 0.5 mandatory break), capped at 8 — e.g. 8.00
  overtimeHours: number        // Hours above 8 — e.g. 0.25
  vehicleId?: string
  vehicleName?: string
  breakTaken: boolean
  shiftSummary: string
  concerns?: string
  photoCount: number
}

export function sendClockOut(payload: ClockOutPayload) {
  return postToFlow(FLOWS.clockOut, payload as unknown as Record<string, unknown>)
}

// ─── Photo Upload ──────────────────────────────────────────────────────────
// Flow action: upload base64 to SharePoint → Projects/{siteName}/Photos/{category}/
// Then create Dataverse record: richco_photos
// Power BI: Photo count by site/date/category
export interface PhotoPayload {
  employeeId: string
  employeeName: string
  siteId: string
  siteName: string
  category: string
  caption?: string
  timestamp: string
  gpsLat?: number
  gpsLng?: number
  photoBase64: string          // base64-encoded image
  fileName: string
}

export function sendPhotoUpload(payload: PhotoPayload) {
  return postToFlow(FLOWS.photoUpload, payload as unknown as Record<string, unknown>)
}

// ─── Alert / Notification ──────────────────────────────────────────────────
// Flow action: post to Teams channel + create Dataverse richco_notifications record
// Power BI: Alert volume by type/date
export interface AlertPayload {
  type: string                 // urgent | ceo | weather | schedule | vendor | general
  title: string
  body: string
  authorId: string
  authorName: string
  targetGroup: string          // 'all' | 'field' | 'supervisors'
  timestamp: string
}

export function sendAlert(payload: AlertPayload) {
  return postToFlow(FLOWS.alert, payload as unknown as Record<string, unknown>)
}

// ─── Break Event ───────────────────────────────────────────────────────────
// Tracked separately for compliance reporting in Power BI
export interface BreakPayload {
  employeeId: string
  timesheetId: string
  event: 'start' | 'end'
  timestamp: string
  breakDurationMinutes?: number  // only on 'end'
}

export function sendBreakEvent(payload: BreakPayload) {
  return postToFlow(FLOWS.breakEvent, payload as unknown as Record<string, unknown>)
}
