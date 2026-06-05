/**
 * Supabase Time Entries Service
 * Stores time tracking data in Supabase as the source of truth
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface TimeEntry {
  id?: string
  employee_id: string
  employee_name: string
  site_id: string
  site_name: string
  clock_in_time: string
  clock_in_latitude?: number
  clock_in_longitude?: number
  clock_in_address?: string
  clock_out_time?: string
  clock_out_latitude?: number
  clock_out_longitude?: number
  clock_out_address?: string
  total_hours?: number
  break_hours?: number
  regular_hours?: number
  overtime_hours?: number
  shift_notes?: string
  concerns?: string
  vehicle_used?: string
  break_taken?: boolean
  photos_count?: number
  geofence_flag?: boolean
  created_at?: string
  updated_at?: string
}

async function timeEntriesRequest(
  method: string,
  endpoint: string,
  data?: unknown,
  returnRepresentation = false
): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Missing credentials')
    return null
  }

  const url = `${SUPABASE_URL}/rest/v1${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  }

  // For POST/PATCH, request the created/updated record back
  if (returnRepresentation && (method === 'POST' || method === 'PATCH')) {
    headers['Prefer'] = 'return=representation'
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error(`[Supabase] ${method} ${endpoint} failed:`, res.status, errorBody)
      throw new Error(`Supabase error: ${res.status}`)
    }

    const text = await res.text()
    return text ? JSON.parse(text) : null
  } catch (err) {
    console.error('[Supabase] Request failed:', err)
    throw err
  }
}

export async function createTimeEntry(entry: TimeEntry): Promise<string | null> {
  try {
    const result = await timeEntriesRequest('POST', '/time_entries', entry, true)
    if (result && result.length > 0) {
      console.log('[Supabase] Created time entry:', result[0].id)
      return result[0].id
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to create time entry:', err)
    return null
  }
}

export async function updateTimeEntry(
  entryId: string,
  updates: Partial<TimeEntry>
): Promise<boolean> {
  try {
    await timeEntriesRequest('PATCH', `/time_entries?id=eq.${entryId}`, updates, true)
    console.log('[Supabase] Updated time entry:', entryId)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to update time entry:', err)
    return false
  }
}

export async function getTimeEntry(entryId: string): Promise<TimeEntry | null> {
  try {
    const result = await timeEntriesRequest('GET', `/time_entries?id=eq.${entryId}`)
    return result && result.length > 0 ? result[0] : null
  } catch (err) {
    console.error('[Supabase] Failed to fetch time entry:', err)
    return null
  }
}

export async function getEmployeeTimeEntries(
  employeeId: string,
  limit = 30
): Promise<TimeEntry[]> {
  try {
    const result = await timeEntriesRequest(
      'GET',
      `/time_entries?employee_id=eq.${employeeId}&order=created_at.desc&limit=${limit}`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch employee time entries:', err)
    return []
  }
}

export async function syncEmployeeTimesheets(employeeId: string, employeeEmail: string): Promise<void> {
  try {
    console.log('[Supabase] Syncing timesheets for', employeeEmail)
    const entries = await getEmployeeTimeEntries(employeeId, 50)

    if (entries.length > 0) {
      const storageKey = `richco-timesheets-${employeeEmail.toLowerCase()}`
      localStorage.setItem(storageKey, JSON.stringify(entries))
      console.log('[Supabase] Synced', entries.length, 'timesheets to localStorage')
    }
  } catch (err) {
    console.error('[Supabase] Failed to sync timesheets:', err)
  }
}

// ─── Break Periods ────────────────────────────────────────────────────────

interface BreakPeriod {
  id?: string
  time_entry_id: string
  break_start: string
  break_end?: string
  duration_minutes?: number
  created_at?: string
}

export async function createBreakPeriod(period: BreakPeriod): Promise<string | null> {
  try {
    const result = await timeEntriesRequest('POST', '/break_periods', period, true)
    if (result && result.length > 0) {
      console.log('[Supabase] Created break period:', result[0].id)
      return result[0].id
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to create break period:', err)
    return null
  }
}

export async function endBreakPeriod(
  breakPeriodId: string,
  endTime: string,
  durationMinutes: number
): Promise<boolean> {
  try {
    await timeEntriesRequest('PATCH', `/break_periods?id=eq.${breakPeriodId}`, {
      break_end: endTime,
      duration_minutes: durationMinutes,
    }, true)
    console.log('[Supabase] Ended break period:', breakPeriodId)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to end break period:', err)
    return false
  }
}

export async function getTimeEntryBreakPeriods(timeEntryId: string): Promise<BreakPeriod[]> {
  try {
    const result = await timeEntriesRequest(
      'GET',
      `/break_periods?time_entry_id=eq.${timeEntryId}&order=break_start.asc`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch break periods:', err)
    return []
  }
}

// ─── Crew Members ─────────────────────────────────────────────────────────

export interface CrewMemberData {
  id: number
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: 'field' | 'supervisor' | 'admin' | 'ceo'
  status?: string
  isAdmin?: boolean
  createdAt?: string
  updatedAt?: string
}

async function crewRequest(
  method: string,
  endpoint: string,
  data?: unknown,
  returnRepresentation = false
): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Missing credentials')
    return null
  }

  const url = `${SUPABASE_URL}/rest/v1${endpoint}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  }

  if (returnRepresentation && (method === 'POST' || method === 'PATCH')) {
    headers['Prefer'] = 'return=representation'
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error(`[Supabase] ${method} ${endpoint} failed:`, res.status, errorBody)
      throw new Error(`Supabase error: ${res.status}`)
    }

    const text = await res.text()
    return text ? JSON.parse(text) : null
  } catch (err) {
    console.error('[Supabase] Crew request failed:', err)
    throw err
  }
}

export async function addCrewMember(data: Omit<CrewMemberData, 'id'>): Promise<CrewMemberData | null> {
  try {
    const payload = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || '',
      role: data.role || 'field',
      status: data.status || 'available',
      is_admin: data.isAdmin || false,
    }

    const result = await crewRequest('POST', '/crew_members', payload, true)
    if (result && result.length > 0) {
      const member = result[0]
      console.log('[Supabase] Added crew member:', member.email, 'ID:', member.id)
      return {
        id: member.id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        phone: member.phone,
        role: member.role,
        status: member.status,
        isAdmin: member.is_admin,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      }
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to add crew member:', err)
    return null
  }
}

export async function getCrewMemberByEmail(email: string): Promise<CrewMemberData | null> {
  try {
    const result = await crewRequest('GET', `/crew_members?email=eq.${encodeURIComponent(email)}`)
    if (result && result.length > 0) {
      const member = result[0]
      return {
        id: member.id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        phone: member.phone,
        role: member.role,
        status: member.status,
        isAdmin: member.is_admin,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      }
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to fetch crew member:', err)
    return null
  }
}

export async function getAllCrewMembers(): Promise<CrewMemberData[]> {
  try {
    const result = await crewRequest('GET', '/crew_members?order=id.asc')
    if (result && Array.isArray(result)) {
      return result.map((member: any) => ({
        id: member.id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        phone: member.phone,
        role: member.role,
        status: member.status,
        isAdmin: member.is_admin,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      }))
    }
    return []
  } catch (err) {
    console.error('[Supabase] Failed to fetch crew members:', err)
    return []
  }
}

export async function updateCrewMember(
  email: string,
  updates: Partial<Omit<CrewMemberData, 'id' | 'email'>>
): Promise<CrewMemberData | null> {
  try {
    const payload: Record<string, any> = {}
    if (updates.firstName) payload.first_name = updates.firstName
    if (updates.lastName) payload.last_name = updates.lastName
    if (updates.phone) payload.phone = updates.phone
    if (updates.role) payload.role = updates.role
    if (updates.status) payload.status = updates.status
    if (updates.isAdmin !== undefined) payload.is_admin = updates.isAdmin

    const result = await crewRequest(
      'PATCH',
      `/crew_members?email=eq.${encodeURIComponent(email)}`,
      payload,
      true
    )
    if (result && result.length > 0) {
      const member = result[0]
      console.log('[Supabase] Updated crew member:', email)
      return {
        id: member.id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        phone: member.phone,
        role: member.role,
        status: member.status,
        isAdmin: member.is_admin,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      }
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to update crew member:', err)
    return null
  }
}
