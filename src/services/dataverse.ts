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
  console.log(`[Dataverse] ${method} ${url}`)

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
      const wwwAuth = res.headers.get('www-authenticate')
      console.error('[Dataverse] 401 Details - www-authenticate:', wwwAuth)
      console.error('[Dataverse] Token scope requested from auth.ts')
      console.error('[Dataverse] API endpoint:', url)
      throw new Error(`Dataverse API error: ${res.status} ${res.statusText} - ${wwwAuth || 'no details'}`)
    }

    if (method === 'POST') {
      // Extract GUID from odata-entityid header
      // Format: https://org.crm.dynamics.com/api/data/v9.2/tables/tablename(guid)
      const entityId = res.headers.get('odata-entityid')
      const guidMatch = entityId?.match(/\(([^)]+)\)/)
      const guid = guidMatch ? guidMatch[1] : null
      console.log('[Dataverse] Created record with ID:', guid)
      return { success: true, id: guid }
    }

    if (method === 'PATCH') {
      return { success: true }
    }

    return res.json()
  } catch (err) {
    console.error('[Dataverse] API call failed:', err)
    throw err
  }
}

// ─── Sites (Projects) ──────────────────────────────────────────────────────

export interface DataverseSite {
  craa5_projectid: string
  craa5_projectname: string
  craa5_client?: string
}

export async function fetchSites(): Promise<DataverseSite[]> {
  try {
    const res = (await apiCall(
      'GET',
      "/craa5_projects?$select=craa5_projectid,craa5_projectname,craa5_client&$filter=craa5_status eq 'active'"
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
    const res = (await apiCall('GET', "/craa5_employees?$select=richco_employeeid,richco_name,richco_department,richco_email,richco_phone,richco_status,richco_aadid")) as any
    return res?.value || []
  } catch (err) {
    console.error('Failed to fetch employees:', err)
    return []
  }
}

export async function createEmployee(emp: Omit<DataverseEmployee, 'richco_employeeid'>): Promise<string | null> {
  try {
    const res = (await apiCall('POST', '/craa5_employees', emp)) as any
    return res?.id || null
  } catch (err) {
    console.error('Failed to create employee:', err)
    return null
  }
}

export async function updateEmployeeAadId(employeeId: string, aadId: string): Promise<boolean> {
  try {
    await apiCall('PATCH', `/craa5_employees(${employeeId})`, { richco_aadid: aadId })
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
      `/craa5_shifts?$filter=richco_employeeid eq '${employeeId}' and richco_date eq '${date}'&$select=richco_shiftid,richco_starttime,richco_endtime,richco_status,richco_projectid`
    )) as any
    return res?.value || []
  } catch (err) {
    console.error('Failed to fetch shifts:', err)
    return []
  }
}

// ─── Time Entries ──────────────────────────────────────────────────────────

export interface DataverseTimeEntry {
  craa5_timeentriesid?: string
  craa5_employee?: string // Employee lookup (email or GUID)
  craa5_project?: string // Project lookup (GUID)
  craa5_clockintime?: string // ISO 8601
  craa5_clockouttime?: string // ISO 8601
  craa5_clockinlatitude?: number // Decimal
  craa5_clockinlongitude?: number // Decimal
  craa5_clockoutlatitude?: number // Decimal
  craa5_clockoutlongitude?: number // Decimal
  craa5_clockinaddress?: string // String
  craa5_clockoutaddress?: string // String
  craa5_totalhours?: number // Decimal
  craa5_overtimehours?: number // Decimal
  craa5_breaktaken?: boolean // Boolean
  craa5_breakduration?: number // Decimal (hours)
  craa5_companyvehicle?: string // Lookup to Company Vehicle
  craa5_standardsconfirmed?: boolean // Boolean
  craa5_supervisorapproval?: string // Choice
  craa5_ceoapproval?: string // Choice
  craa5_status?: string // Choice: active, completed, flagged
  craa5_flagreason?: string // Choice
}

export async function createTimeEntry(entry: Omit<DataverseTimeEntry, 'craa5_timeentriesid'>): Promise<string | null> {
  try {
    console.log('[Dataverse] Creating time entry with data:', entry)
    const res = (await apiCall('POST', '/craa5_timeentries', entry)) as any
    console.log('[Dataverse] Created time entry response:', res)
    if (res?.id) {
      console.log('[Dataverse] ✅ Time entry created with ID:', res.id)
      return res.id
    } else {
      console.error('[Dataverse] ❌ No ID returned from create:', res)
      return null
    }
  } catch (err) {
    console.error('[Dataverse] ❌ Failed to create time entry:', err)
    return null
  }
}

export async function updateTimeEntry(entryId: string, data: Partial<DataverseTimeEntry>): Promise<boolean> {
  try {
    await apiCall('PATCH', `/craa5_timeentries(${entryId})`, data)
    console.log('[Dataverse] Updated time entry:', entryId)
    return true
  } catch (err) {
    console.error('Failed to update time entry:', err)
    return false
  }
}

// ─── Time Entries (fetch recent) ──────────────────────────────────────

export async function fetchRecentTimeEntries(employeeEmail: string, limit: number = 10): Promise<DataverseTimeEntry[]> {
  try {
    const res = (await apiCall(
      'GET',
      `/craa5_timeentries?$filter=craa5_employee eq '${employeeEmail}' and craa5_status eq 'completed'&$select=craa5_timeentriesid,craa5_employee,craa5_project,craa5_clockintime,craa5_clockouttime,craa5_totalhours,craa5_breakduration,craa5_status,craa5_clockinaddress,craa5_clockoutaddress,craa5_breaktaken&$orderby=craa5_clockouttime desc&$top=${limit}`
    )) as any
    console.log('[Dataverse] Fetched recent time entries:', res?.value)
    return res?.value || []
  } catch (err) {
    console.error('Failed to fetch recent time entries:', err)
    return []
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
