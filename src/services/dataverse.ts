/**
 * Dataverse API Service
 * Queries employees, shifts, creates time entries
 */

import { getAccessToken } from './auth'

// IMPORTANT: Set these in your environment
const DATAVERSE_ORG = import.meta.env.VITE_DATAVERSE_ORG || ''
const DATAVERSE_URL = `https://${DATAVERSE_ORG}.crm.dynamics.com/api/data/v9.2`

async function apiCall(method: string, endpoint: string, data?: unknown): Promise<unknown> {
  const token = await getAccessToken()
  if (!token) {
    console.warn('[Dataverse] No auth token — using mock data')
    return null
  }

  const url = `${DATAVERSE_URL}${endpoint}`

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!res.ok) {
      throw new Error(`Dataverse API error: ${res.status} ${res.statusText}`)
    }

    if (method === 'POST' || method === 'PATCH') {
      return { success: true, id: res.headers.get('odata-entityid') }
    }

    return res.json()
  } catch (err) {
    console.error('[Dataverse] API call failed:', err)
    throw err
  }
}

// ─── Sites (Projects) ──────────────────────────────────────────────────────

export interface DataverseSite {
  richco_projectid: string
  richco_name: string
  richco_address?: string
}

export async function fetchSites(): Promise<DataverseSite[]> {
  try {
    const res = (await apiCall(
      'GET',
      "/tables/craa5_Project?$select=craa5_projectid,craa5_name,craa5_address&$filter=craa5_status eq 'active'"
    )) as any
    console.log('[Dataverse] Fetched sites:', res?.value)
    return res?.value || []
  } catch (err) {
    console.error('Failed to fetch sites:', err)
    return []
  }
}

// ─── Employees ─────────────────────────────────────────────────────────────

export interface DataverseEmployee {
  richco_employeeid: string // Primary key
  richco_name: string
  richco_department: string
  richco_birthday: string
  richco_dateofhire: string
  richco_email: string
  richco_phone: string
  richco_homeaddress: string
  richco_status: string // active, inactive, etc.
  richco_aadid?: string // Azure AD ID — populated on first login
}

export async function fetchEmployees(): Promise<DataverseEmployee[]> {
  try {
    const res = (await apiCall('GET', "/tables/richco_employees?$select=richco_employeeid,richco_name,richco_department,richco_email,richco_phone,richco_status,richco_aadid")) as any
    return res?.value || []
  } catch (err) {
    console.error('Failed to fetch employees:', err)
    return []
  }
}

export async function createEmployee(emp: Omit<DataverseEmployee, 'richco_employeeid'>): Promise<string | null> {
  try {
    const res = (await apiCall('POST', '/tables/richco_employees', emp)) as any
    return res?.id || null
  } catch (err) {
    console.error('Failed to create employee:', err)
    return null
  }
}

export async function updateEmployeeAadId(employeeId: string, aadId: string): Promise<boolean> {
  try {
    await apiCall('PATCH', `/tables/richco_employees(${employeeId})`, { richco_aadid: aadId })
    return true
  } catch (err) {
    console.error('Failed to update employee AAD ID:', err)
    return false
  }
}

// ─── Shifts ────────────────────────────────────────────────────────────────

export interface DataverseShift {
  richco_shiftid: string
  richco_employeeid: string // Lookup to employees
  richco_projectid: string // Lookup to projects
  richco_date: string // YYYY-MM-DD
  richco_starttime: string // HH:MM (24-hour)
  richco_endtime: string // HH:MM (24-hour)
  richco_status: string // scheduled, active, completed
}

export async function fetchEmployeeShifts(employeeId: string, date: string): Promise<DataverseShift[]> {
  try {
    const res = (await apiCall(
      'GET',
      `/tables/richco_shifts?$filter=richco_employeeid eq '${employeeId}' and richco_date eq '${date}'&$select=richco_shiftid,richco_starttime,richco_endtime,richco_status,richco_projectid`
    )) as any
    return res?.value || []
  } catch (err) {
    console.error('Failed to fetch shifts:', err)
    return []
  }
}

// ─── Time Entries ──────────────────────────────────────────────────────────

export interface DataverseTimeEntry {
  richco_timeentryid: string
  richco_employeeid: string // Lookup to employees
  richco_aadid: string // Azure AD ID for Power Automate email reports
  richco_email: string // Employee email
  richco_projectid: string // Lookup to projects
  richco_clockintime: string // ISO 8601
  richco_clockouttime?: string
  richco_totalhours?: number // Decimal
  richco_breakhours?: number // Decimal (actual breaks taken)
  richco_regularhours?: number // Decimal (after mandatory deduction)
  richco_overtimehours?: number // Decimal
  richco_breakstart?: string // ISO 8601
  richco_breakend?: string // ISO 8601
  richco_breakduration?: number // Minutes
  richco_vehicleid?: string
  richco_shiftsummary?: string
  richco_concerns?: string
  richco_photossubmitted?: number
  richco_status: string // active, complete, flagged, approved
  richco_geofenceflag?: boolean
  richco_gpslat?: number
  richco_gpslng?: number
  richco_gpsaddress?: string
}

export async function createTimeEntry(entry: Omit<DataverseTimeEntry, 'richco_timeentryid'>): Promise<string | null> {
  try {
    const res = (await apiCall('POST', '/tables/craa5_TimeEntries', entry)) as any
    console.log('[Dataverse] Created time entry:', res)
    return res?.id || null
  } catch (err) {
    console.error('Failed to create time entry:', err)
    return null
  }
}

export async function updateTimeEntry(entryId: string, data: Partial<DataverseTimeEntry>): Promise<boolean> {
  try {
    await apiCall('PATCH', `/tables/craa5_TimeEntries(${entryId})`, data)
    console.log('[Dataverse] Updated time entry:', entryId)
    return true
  } catch (err) {
    console.error('Failed to update time entry:', err)
    return false
  }
}

// ─── Helper: Determine if shift is overnight ───────────────────────────────

export function isOvernightShift(startTime: string, endTime: string): boolean {
  // startTime and endTime are HH:MM format (24-hour)
  const [startHour] = startTime.split(':').map(Number)
  const [endHour] = endTime.split(':').map(Number)

  // Overnight if start >= 19:00 (7 PM) or end < start (wrapped midnight)
  return startHour >= 19 || endHour < startHour
}

export function getMandatoryBreakHours(isOvernight: boolean): number {
  return isOvernight ? 0.5 : 1.0 // -0.5h overnight, -1h day shift
}
