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
  craa5_projectid: string // GUID
  craa5_projectname: string
  craa5_client?: string
}

export async function fetchSites(): Promise<DataverseSite[]> {
  try {
    // Remove filter to test basic connectivity
    const res = (await apiCall(
      'GET',
      "/craa5_projects?$select=craa5_projectid,craa5_projectname,craa5_client"
    )) as any
    console.log('[Dataverse] Fetched sites:', res?.value)
    return res?.value || []
  } catch (err) {
    console.error('Failed to fetch sites:', err)
    return []
  }
}

export async function getProjectByName(projectName: string): Promise<string | null> {
  try {
    const res = (await apiCall('GET', `/craa5_projects?$filter=craa5_projectname eq '${projectName}'&$select=craa5_projectid`)) as any
    const project = res?.value?.[0]
    if (project?.craa5_projectid) {
      console.log('[Dataverse] Found project GUID for', projectName, ':', project.craa5_projectid)
      return project.craa5_projectid
    }
    console.warn('[Dataverse] No project found for name:', projectName)
    return null
  } catch (err) {
    console.error('Failed to fetch project by name:', err)
    return null
  }
}

// ─── Employees ─────────────────────────────────────────────────────────────

export interface DataverseEmployee {
  craa5_employeeid: string // Primary key (GUID)
  craa5_name: string
  craa5_email: string
  craa5_status?: string // active, inactive, etc.
}

export async function fetchEmployees(): Promise<DataverseEmployee[]> {
  try {
    const res = (await apiCall('GET', "/craa5_employees?$select=craa5_employeeid,craa5_name,craa5_email,craa5_status")) as any
    return res?.value || []
  } catch (err) {
    console.error('Failed to fetch employees:', err)
    return []
  }
}

export async function getEmployeeByEmail(email: string): Promise<string | null> {
  try {
    const res = (await apiCall('GET', `/craa5_employees?$filter=craa5_email eq '${email}'&$select=craa5_employeeid`)) as any
    const employee = res?.value?.[0]
    if (employee?.craa5_employeeid) {
      console.log('[Dataverse] Found employee GUID for', email, ':', employee.craa5_employeeid)
      return employee.craa5_employeeid
    }
    console.warn('[Dataverse] No employee found for email:', email)
    return null
  } catch (err) {
    console.error('Failed to fetch employee by email:', err)
    return null
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
  Employee?: string // Email address (string, not lookup)
  craa5_project?: string // Project name or ID
  craa5_clockintime?: string // ISO 8601
  craa5_clockouttime?: string // ISO 8601
  craa5_breakstart?: string // ISO 8601 (Break Start time)
  craa5_breakend?: string // ISO 8601 (Break End time)
  craa5_breakduration?: number // Decimal (hours)
  craa5_totalhours?: number // Decimal
  craa5_status?: string // Choice field value
  craa5_shiftnotes?: string // Notes/summary
  craa5_concerns?: string // Issues or concerns
  // Additional optional fields
  craa5_clockinlatitude?: number
  craa5_clockinlongitude?: number
  craa5_clockoutlatitude?: number
  craa5_clockoutlongitude?: number
  craa5_clockinaddress?: string
  craa5_clockoutaddress?: string
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
      `/craa5_timeentries?$filter=Employee eq '${employeeEmail}'&$select=craa5_timeentriesid,Employee,craa5_project,craa5_clockintime,craa5_clockouttime,craa5_totalhours,craa5_breakduration,craa5_status,craa5_breakstart,craa5_breakend&$orderby=craa5_clockouttime desc&$top=${limit}`
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
