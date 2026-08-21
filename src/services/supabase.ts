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
    const result = await timeEntriesRequest('PATCH', `/time_entries?id=eq.${entryId}`, updates, true)
    console.log('[Supabase] Updated time entry:', entryId, 'result:', result)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to update time entry:', entryId, err instanceof Error ? err.message : err)
    return false
  }
}

export async function adjustTimeEntryByAdmin(
  timeEntryId: string,
  adjustedHours: number,
  adminNote: string,
  adminUserId: string
): Promise<boolean> {
  try {
    // Calculate work hours (adjusted - break hours)
    const entry = await getTimeEntry(timeEntryId)
    if (!entry) {
      console.error('[Supabase] Time entry not found:', timeEntryId)
      return false
    }

    const breakHours = entry.break_hours || 0
    const workHours = Math.max(0, adjustedHours - breakHours)
    // NOTE: Overtime is calculated WEEKLY (not daily) - remove daily overtime calculation

    console.log('[Supabase] Adjusting timecard:', {
      timeEntryId,
      originalHours: entry.total_hours,
      adjustedHours,
      breakHours,
      workHours,
    })

    const updates = {
      adjusted_hours: adjustedHours,
      adjusted_by_admin: true,
      admin_adjustment_note: adminNote,
      adjusted_at: new Date().toISOString(),
      adjusted_by_user_id: adminUserId,
      regular_hours: workHours, // All hours counted as regular at entry level; overtime calculated weekly
      overtime_hours: 0, // Overtime calculated weekly, not daily
      total_hours: adjustedHours,
    }

    await timeEntriesRequest(
      'PATCH',
      `/time_entries?id=eq.${timeEntryId}`,
      updates,
      true
    )

    console.log('[Supabase] Adjusted time entry:', timeEntryId)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to adjust time entry:', err)
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

export async function getActiveTimeEntry(employeeId: string): Promise<TimeEntry | null> {
  try {
    console.log('[Supabase] Fetching active time entry for', employeeId)
    const result = await timeEntriesRequest(
      'GET',
      `/time_entries?employee_id=eq.${employeeId}&clock_out_time=is.null&order=created_at.desc&limit=1`
    )
    if (result && result.length > 0) {
      console.log('[Supabase] Found active time entry:', result[0].id)
      return result[0]
    }
    console.log('[Supabase] No active time entry found')
    return null
  } catch (err) {
    console.error('[Supabase] Failed to fetch active time entry:', err)
    return null
  }
}

/**
 * Check if user has an active clock-in on any device
 * Used to prevent duplicate clock-ins (Layer 3: Duplicate Prevention)
 */
export async function checkActiveClockIn(employeeId: string): Promise<TimeEntry | null> {
  return getActiveTimeEntry(employeeId)
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
  avatarUrl?: string
  role: 'site_employee' | 'office_staff' | 'leadership'
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
    // Try to get the auth user ID to link with crew member
    let userId: string | null = null
    try {
      const { data: { user }, error } = await supabase.auth.admin.getUserById(data.email)
      if (!error && user) {
        userId = user.id
      } else {
        // Try fetching by email from auth.users
        const { data: authUsers } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', data.email)
          .maybeSingle()
        if (authUsers) {
          userId = authUsers.id
        }
      }
    } catch (err) {
      console.warn('[Supabase] Could not fetch auth user ID for:', data.email, err)
    }

    const payload: any = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || '',
      avatar_url: data.avatarUrl || '',
      role: data.role || 'site_employee',
      status: data.status || 'available',
      is_admin: data.isAdmin || false,
    }

    // Add user_id if we found it
    if (userId) {
      payload.user_id = userId
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
        avatarUrl: member.avatar_url,
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
        avatarUrl: member.avatar_url,
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
    // Filter out deleted users (status != 'deleted')
    const result = await crewRequest('GET', '/crew_members?status=neq.deleted&order=id.asc')
    if (result && Array.isArray(result)) {
      return result.map((member: any) => ({
        id: member.id,
        email: member.email,
        firstName: member.first_name,
        lastName: member.last_name,
        phone: member.phone,
        avatarUrl: member.avatar_url,
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
    if (updates.avatarUrl) payload.avatar_url = updates.avatarUrl
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
        avatarUrl: member.avatar_url,
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

// ─── Projects ────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  client?: string
  location?: string
  status?: 'active' | 'inactive' | 'completed'
  created_at?: string
  updated_at?: string
}

async function projectsRequest(
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
    console.error('[Supabase] Projects request failed:', err)
    throw err
  }
}

export async function getProjects(status: string = 'active'): Promise<Project[]> {
  try {
    const result = await projectsRequest(
      'GET',
      `/projects?status=eq.${status}&order=name.asc`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch projects:', err)
    return []
  }
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project | null> {
  try {
    const payload = {
      name: project.name,
      client: project.client || '',
      location: project.location || '',
      status: project.status || 'active',
    }
    const result = await projectsRequest('POST', '/projects', payload, true)
    if (result && result.length > 0) {
      console.log('[Supabase] Created project:', result[0].id)
      return result[0]
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to create project:', err)
    return null
  }
}

// ─── Shift Roster ─────────────────────────────────────────────────────────

export interface ShiftRosterRow {
  id?: string
  project_id: string
  shift_type: 'day' | 'night'
  geolocation?: { latitude: number; longitude: number; address?: string }
  custom_data: Record<string, any>
  comments?: string
  created_at?: string
  updated_at?: string
}

export interface ShiftRosterColumn {
  id?: string
  project_id: string
  column_name: string
  column_type: 'text' | 'number' | 'date' | 'select'
  options?: string[]
  order: number
  created_at?: string
}

async function shiftRosterRequest(
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
    console.error('[Supabase] Shift roster request failed:', err)
    throw err
  }
}

export async function getShiftRosterRows(projectId: string): Promise<ShiftRosterRow[]> {
  try {
    const result = await shiftRosterRequest(
      'GET',
      `/shift_roster_rows?project_id=eq.${projectId}&order=created_at.desc`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch shift roster rows:', err)
    return []
  }
}

export async function createShiftRosterRow(row: Omit<ShiftRosterRow, 'id' | 'created_at' | 'updated_at'>): Promise<ShiftRosterRow | null> {
  try {
    const payload = {
      project_id: row.project_id,
      shift_type: row.shift_type,
      geolocation: row.geolocation || null,
      custom_data: row.custom_data || {},
      comments: row.comments || '',
    }
    const result = await shiftRosterRequest('POST', '/shift_roster_rows', payload, true)
    if (result && result.length > 0) {
      console.log('[Supabase] Created shift roster row:', result[0].id)
      return result[0]
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to create shift roster row:', err)
    return null
  }
}

export async function updateShiftRosterRow(rowId: string, updates: Partial<ShiftRosterRow>): Promise<boolean> {
  try {
    const payload: Record<string, any> = {}
    if (updates.shift_type) payload.shift_type = updates.shift_type
    if (updates.geolocation !== undefined) payload.geolocation = updates.geolocation
    if (updates.custom_data) payload.custom_data = updates.custom_data
    if (updates.comments !== undefined) payload.comments = updates.comments

    await shiftRosterRequest('PATCH', `/shift_roster_rows?id=eq.${rowId}`, payload, true)
    console.log('[Supabase] Updated shift roster row:', rowId)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to update shift roster row:', err)
    return false
  }
}

export async function deleteShiftRosterRow(rowId: string): Promise<boolean> {
  try {
    await shiftRosterRequest('DELETE', `/shift_roster_rows?id=eq.${rowId}`)
    console.log('[Supabase] Deleted shift roster row:', rowId)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to delete shift roster row:', err)
    return false
  }
}

export async function getShiftRosterColumns(projectId: string): Promise<ShiftRosterColumn[]> {
  try {
    const result = await shiftRosterRequest(
      'GET',
      `/shift_roster_columns?project_id=eq.${projectId}&order=order.asc`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch shift roster columns:', err)
    return []
  }
}

export async function createShiftRosterColumn(column: Omit<ShiftRosterColumn, 'id' | 'created_at'>): Promise<ShiftRosterColumn | null> {
  try {
    const payload = {
      project_id: column.project_id,
      column_name: column.column_name,
      column_type: column.column_type,
      options: column.options || null,
      order: column.order,
    }
    const result = await shiftRosterRequest('POST', '/shift_roster_columns', payload, true)
    if (result && result.length > 0) {
      console.log('[Supabase] Created shift roster column:', result[0].id)
      return result[0]
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to create shift roster column:', err)
    return null
  }
}

export async function updateShiftRosterColumn(columnId: string, updates: Partial<ShiftRosterColumn>): Promise<boolean> {
  try {
    const payload: Record<string, any> = {}
    if (updates.column_name) payload.column_name = updates.column_name
    if (updates.column_type) payload.column_type = updates.column_type
    if (updates.options) payload.options = updates.options
    if (updates.order !== undefined) payload.order = updates.order

    await shiftRosterRequest('PATCH', `/shift_roster_columns?id=eq.${columnId}`, payload, true)
    console.log('[Supabase] Updated shift roster column:', columnId)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to update shift roster column:', err)
    return false
  }
}

export async function deleteShiftRosterColumn(columnId: string): Promise<boolean> {
  try {
    await shiftRosterRequest('DELETE', `/shift_roster_columns?id=eq.${columnId}`)
    console.log('[Supabase] Deleted shift roster column:', columnId)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to delete shift roster column:', err)
    return false
  }
}

// ─── Shifts & Locations ───────────────────────────────────────────────────

export interface ShiftData {
  id?: string
  crew_member_id: number
  scheduled_date: string
  start_time: string
  end_time: string
  shift_type: 'day' | 'night'
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled'
  notes?: string
  project_id?: string
  park_opening_hour?: string
  park_closing_hour?: string
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface ShiftLocationData {
  id?: string
  shift_id: string
  sequence_order: number
  location_name: string
  latitude?: number
  longitude?: number
  address?: string
  start_time?: string
  end_time?: string
  notes?: string
  created_at?: string
}

export async function getUpcomingShifts(crewMemberId: number, daysAhead = 30): Promise<ShiftData[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0]
    const result = await shiftRosterRequest(
      'GET',
      `/shifts?crew_member_id=eq.${crewMemberId}&scheduled_date=gte.${today}&scheduled_date=lte.${futureDate}&order=scheduled_date.asc`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch upcoming shifts:', err)
    return []
  }
}

export async function getTodayShift(crewMemberId: number): Promise<ShiftData | null> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const result = await shiftRosterRequest(
      'GET',
      `/shifts?crew_member_id=eq.${crewMemberId}&scheduled_date=eq.${today}`
    )
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to fetch today shift:', err)
    return null
  }
}

export async function createShift(shift: Omit<ShiftData, 'id' | 'created_at' | 'updated_at'>, locations: ShiftLocationData[] = []): Promise<ShiftData | null> {
  try {
    const payload = {
      crew_member_id: shift.crew_member_id,
      scheduled_date: shift.scheduled_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      shift_type: shift.shift_type,
      status: shift.status || 'scheduled',
      notes: shift.notes || null,
      created_by: shift.created_by || null,
    }
    const result = await shiftRosterRequest('POST', '/shifts', payload, true)
    if (result && result.length > 0) {
      const shiftData = result[0]
      console.log('[Supabase] Created shift:', shiftData.id)

      // Add locations if provided
      if (locations && locations.length > 0) {
        const locationsPayload = locations.map((loc, idx) => ({
          shift_id: shiftData.id,
          sequence_order: idx + 1,
          location_name: loc.location_name,
          latitude: loc.latitude || null,
          longitude: loc.longitude || null,
          address: loc.address || null,
          start_time: loc.start_time || null,
          end_time: loc.end_time || null,
          notes: loc.notes || null,
        }))

        try {
          await shiftRosterRequest('POST', '/shift_locations', locationsPayload)
          console.log('[Supabase] Added', locations.length, 'locations to shift')
        } catch (locErr) {
          console.error('[Supabase] Failed to add locations:', locErr)
        }
      }

      return shiftData
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to create shift:', err)
    return null
  }
}

export async function updateShiftStatus(shiftId: string, status: 'scheduled' | 'active' | 'completed' | 'cancelled'): Promise<boolean> {
  try {
    await shiftRosterRequest('PATCH', `/shifts?id=eq.${shiftId}`, { status, updated_at: new Date().toISOString() }, true)
    console.log('[Supabase] Updated shift status:', shiftId, status)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to update shift status:', err)
    return false
  }
}

export async function getShiftLocations(shiftId: string): Promise<ShiftLocationData[]> {
  try {
    const result = await shiftRosterRequest(
      'GET',
      `/shift_locations?shift_id=eq.${shiftId}&order=sequence_order.asc`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch shift locations:', err)
    return []
  }
}

// ─── Daily Checklists ──────────────────────────────────────────────────────

export interface DailyChecklistData {
  id?: string
  checklist_date: string
  created_at?: string
  updated_at?: string
  created_by?: string
}

export interface ChecklistItemData {
  id?: string
  daily_checklist_id: string
  title: string
  description?: string
  order_num: number
  created_at?: string
}

export interface ChecklistSubmissionData {
  id?: string
  checklist_item_id: string
  crew_member_id: number
  checklist_date: string
  is_complete: boolean
  reason_text?: string
  submitted_at?: string
  updated_at?: string
}

export async function getTodayChecklist(): Promise<DailyChecklistData | null> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const result = await shiftRosterRequest(
      'GET',
      `/daily_checklists?checklist_date=eq.${today}`
    )
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to fetch today checklist:', err)
    return null
  }
}

export async function getChecklistForDate(date: string): Promise<DailyChecklistData | null> {
  try {
    const result = await shiftRosterRequest(
      'GET',
      `/daily_checklists?checklist_date=eq.${date}`
    )
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to fetch checklist:', err)
    return null
  }
}

export async function getChecklistItems(checklistId: string): Promise<ChecklistItemData[]> {
  try {
    const result = await shiftRosterRequest(
      'GET',
      `/checklist_items?daily_checklist_id=eq.${checklistId}&order=order_num.asc`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch checklist items:', err)
    return []
  }
}

export async function getCrewChecklistSubmissions(crewMemberId: number, date: string): Promise<ChecklistSubmissionData[]> {
  try {
    const result = await shiftRosterRequest(
      'GET',
      `/checklist_submissions?crew_member_id=eq.${crewMemberId}&checklist_date=eq.${date}`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch checklist submissions:', err)
    return []
  }
}

export async function submitChecklistItem(submission: Omit<ChecklistSubmissionData, 'id' | 'submitted_at' | 'updated_at'>): Promise<ChecklistSubmissionData | null> {
  try {
    // Check if already exists
    const existing = await shiftRosterRequest(
      'GET',
      `/checklist_submissions?checklist_item_id=eq.${submission.checklist_item_id}&crew_member_id=eq.${submission.crew_member_id}&checklist_date=eq.${submission.checklist_date}`
    )

    if (existing && existing.length > 0) {
      // Update existing
      const result = await shiftRosterRequest(
        'PATCH',
        `/checklist_submissions?id=eq.${existing[0].id}`,
        {
          is_complete: submission.is_complete,
          reason_text: submission.reason_text || null,
          updated_at: new Date().toISOString(),
        },
        true
      )
      if (result && result.length > 0) {
        console.log('[Supabase] Updated checklist submission:', existing[0].id)
        return result[0]
      }
    } else {
      // Create new
      const result = await shiftRosterRequest(
        'POST',
        '/checklist_submissions',
        {
          checklist_item_id: submission.checklist_item_id,
          crew_member_id: submission.crew_member_id,
          checklist_date: submission.checklist_date,
          is_complete: submission.is_complete,
          reason_text: submission.reason_text || null,
        },
        true
      )
      if (result && result.length > 0) {
        console.log('[Supabase] Created checklist submission:', result[0].id)
        return result[0]
      }
    }

    return null
  } catch (err) {
    console.error('[Supabase] Failed to submit checklist item:', err)
    return null
  }
}

export async function createDailyChecklist(items: Omit<ChecklistItemData, 'id' | 'daily_checklist_id' | 'created_at'>[], date: string, createdBy?: string): Promise<DailyChecklistData | null> {
  try {
    const checklistPayload = {
      checklist_date: date,
      created_by: createdBy || null,
    }
    const result = await shiftRosterRequest('POST', '/daily_checklists', checklistPayload, true)
    if (result && result.length > 0) {
      const checklistData = result[0]
      console.log('[Supabase] Created checklist:', checklistData.id)

      // Add items
      const itemsPayload = items.map((item, idx) => ({
        daily_checklist_id: checklistData.id,
        title: item.title,
        description: item.description || null,
        order_num: idx + 1,
      }))

      try {
        await shiftRosterRequest('POST', '/checklist_items', itemsPayload)
        console.log('[Supabase] Added', items.length, 'checklist items')
      } catch (itemErr) {
        console.error('[Supabase] Failed to add checklist items:', itemErr)
      }

      return checklistData
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to create checklist:', err)
    return null
  }
}

// ─── Shift Assignments ────────────────────────────────────────────────────

export interface ShiftAssignmentData {
  id?: string
  shift_id: string
  crew_member_id: number
  assigned_date: string
  created_at?: string
  updated_at?: string
}

export async function assignCrewToShift(crewMemberId: number, shiftId: string, assignedDate: string): Promise<ShiftAssignmentData | null> {
  try {
    const payload = {
      shift_id: shiftId,
      crew_member_id: crewMemberId,
      assigned_date: assignedDate,
    }
    const result = await shiftRosterRequest('POST', '/shift_assignments', payload, true)
    if (result && result.length > 0) {
      console.log('[Supabase] Assigned crew', crewMemberId, 'to shift', shiftId)
      return result[0]
    }
    return null
  } catch (err) {
    console.error('[Supabase] Failed to assign crew to shift:', err)
    return null
  }
}

export async function getCrewShiftAssignment(crewMemberId: number, date: string): Promise<ShiftData & { locations: ShiftLocationData[] } | null> {
  try {
    // Get the assignment
    const assignmentResult = await shiftRosterRequest(
      'GET',
      `/shift_assignments?crew_member_id=eq.${crewMemberId}&assigned_date=eq.${date}`
    )

    if (!assignmentResult || assignmentResult.length === 0) {
      return null
    }

    const assignment = assignmentResult[0]

    // Get the full shift with locations
    const shiftResult = await shiftRosterRequest(
      'GET',
      `/shifts?id=eq.${assignment.shift_id}`
    )

    if (!shiftResult || shiftResult.length === 0) {
      return null
    }

    const shift = shiftResult[0]

    // Get locations
    const locations = await getShiftLocations(shift.id)

    return { ...shift, locations }
  } catch (err) {
    console.error('[Supabase] Failed to fetch crew shift assignment:', err)
    return null
  }
}

export async function getShiftAssignments(shiftId: string): Promise<(ShiftAssignmentData & { crew_member?: CrewMemberData })[]> {
  try {
    const result = await shiftRosterRequest(
      'GET',
      `/shift_assignments?shift_id=eq.${shiftId}&order=assigned_date.asc`
    )
    return result || []
  } catch (err) {
    console.error('[Supabase] Failed to fetch shift assignments:', err)
    return []
  }
}

export async function removeCrewFromShift(assignmentId: string): Promise<boolean> {
  try {
    await shiftRosterRequest('DELETE', `/shift_assignments?id=eq.${assignmentId}`)
    console.log('[Supabase] Removed crew from shift:', assignmentId)
    return true
  } catch (err) {
    console.error('[Supabase] Failed to remove crew from shift:', err)
    return false
  }
}

// ─── File Uploads ────────────────────────────────────────────────────────────

import { supabase } from './supabaseAuth'

export async function uploadCrewFile(
  email: string,
  fileType: 'identification' | 'qualification' | 'employment_file',
  file: File
): Promise<{ url: string; name: string; path: string } | null> {
  try {
    if (!SUPABASE_URL) return null

    // Create unique file path
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop() || 'bin'
    const filePath = `crew/${email}/${fileType}/${timestamp}-${file.name.replace(/[^a-z0-9.-]/gi, '_')}`

    // Upload to the 'documents' bucket (exists and is configured)
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, { upsert: false })

    if (uploadError) {
      console.error('[Supabase] File upload failed:', uploadError.message)
      return null
    }

    // Generate signed URL for private documents (1 hour expiry)
    const { data: signedData } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600)

    const signedUrl = signedData?.signedUrl || ''

    console.log('[Supabase] File uploaded:', filePath)
    return { url: signedUrl, name: file.name, path: filePath }
  } catch (err) {
    console.error('[Supabase] File upload error:', err)
    return null
  }
}

// ─── Employee Documents (Identification, Qualifications, Employment Files) ────────────────────

export interface EmployeeDocument {
  id?: number
  crew_member_email: string
  document_type: 'identification' | 'qualification' | 'employment_file'
  file_name: string
  file_url: string
  uploaded_date: number
}

/**
 * Add an employee document (identification, qualification, or employment file)
 */
export async function addEmployeeDocument(
  email: string,
  docType: 'identification' | 'qualification' | 'employment_file',
  fileName: string,
  fileUrl: string,
  uploadedDate: number
): Promise<EmployeeDocument | null> {
  try {
    const { data, error } = await supabase
      .from('employee_documents')
      .insert([
        {
          crew_member_email: email,
          document_type: docType,
          file_name: fileName,
          file_url: fileUrl,
          uploaded_date: uploadedDate,
        },
      ])
      .select()

    if (error) {
      console.error('[Supabase] Failed to add employee document:', error.message)
      return null
    }

    console.log('[Supabase] Added employee document:', email, docType)
    return data?.[0] || null
  } catch (err) {
    console.error('[Supabase] Error adding employee document:', err)
    return null
  }
}

/**
 * Get all documents for an employee
 */
export async function getEmployeeDocuments(email: string): Promise<EmployeeDocument[]> {
  try {
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('crew_member_email', email)

    if (error) {
      console.error('[Supabase] Failed to fetch employee documents:', error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.error('[Supabase] Error fetching employee documents:', err)
    return []
  }
}

/**
 * Delete an employee document
 */
export async function deleteEmployeeDocument(documentId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      console.error('[Supabase] Failed to delete employee document:', error.message)
      return false
    }

    console.log('[Supabase] Deleted employee document:', documentId)
    return true
  } catch (err) {
    console.error('[Supabase] Error deleting employee document:', err)
    return false
  }
}

/**
 * Delete all documents of a specific type for an employee
 */
export async function deleteEmployeeDocumentsByType(
  email: string,
  docType: 'identification' | 'qualification' | 'employment_file'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('crew_member_email', email)
      .eq('document_type', docType)

    if (error) {
      console.error('[Supabase] Failed to delete documents by type:', error.message)
      return false
    }

    console.log('[Supabase] Deleted employee documents by type:', email, docType)
    return true
  } catch (err) {
    console.error('[Supabase] Error deleting documents by type:', err)
    return false
  }
}

/**
 * Legacy function - deprecated
 * Use addEmployeeDocument() instead
 */
export async function updateCrewMemberFiles(
  email: string,
  updates: {
    identification?: { type: string; url: string; uploadedDate: number }
    qualifications?: Array<{ name: string; url?: string; uploadedDate?: number }>
    employmentFiles?: Array<{ name: string; type: string; url?: string; uploadedDate?: number }>
  }
): Promise<boolean> {
  try {
    console.warn('[Supabase] updateCrewMemberFiles is deprecated - use addEmployeeDocument() instead')

    // Try to add documents to the new table
    if (updates.identification) {
      await addEmployeeDocument(email, 'identification', 'identification', updates.identification.url, updates.identification.uploadedDate)
    }

    if (updates.qualifications && updates.qualifications.length > 0) {
      for (const qual of updates.qualifications) {
        if (qual.url) {
          await addEmployeeDocument(email, 'qualification', qual.name, qual.url, qual.uploadedDate || Date.now())
        }
      }
    }

    if (updates.employmentFiles && updates.employmentFiles.length > 0) {
      for (const file of updates.employmentFiles) {
        if (file.url) {
          await addEmployeeDocument(email, 'employment_file', file.name, file.url, file.uploadedDate || Date.now())
        }
      }
    }

    console.log('[Supabase] Migrated crew member files for:', email)
    return true
  } catch (err) {
    console.error('[Supabase] Error migrating crew member files:', err)
    return true
  }
}

// ─── Weekly Reporting ─────────────────────────────────────────────────────────

export interface WeeklyTimeEntryReport {
  employee_id: string
  employee_name: string
  employee_email: string
  week_start: string
  week_end: string
  entries: Array<{
    date: string
    site_name: string
    clock_in: string
    clock_out: string
    total_hours: number
    break_hours: number
    regular_hours: number
    overtime_hours: number
  }>
  weekly_totals: {
    total_hours: number
    regular_hours: number
    overtime_hours: number
    break_hours: number
    days_worked: number
  }
}

export async function getWeeklyTimeEntriesReport(
  startDate: string,
  endDate: string
): Promise<WeeklyTimeEntryReport[]> {
  try {
    const result = await timeEntriesRequest(
      'GET',
      `/time_entries?clock_in_time=gte.${startDate}&clock_in_time=lte.${endDate}&order=employee_id.asc,clock_in_time.asc`
    )

    if (!result || !Array.isArray(result)) {
      return []
    }

    // Get crew member emails
    const crewResult = await crewRequest('GET', '/crew_members')
    const crewMap = new Map<string, { email: string; name: string }>(
      (crewResult?.map((c: any) => [c.id, { email: c.email || '', name: `${c.first_name || ''} ${c.last_name || ''}`.trim() }]) || []) as Array<[string, { email: string; name: string }]>
    )

    // Group entries by employee
    const entriesByEmployee = new Map<string, any[]>()
    result.forEach((entry: any) => {
      if (!entriesByEmployee.has(entry.employee_id)) {
        entriesByEmployee.set(entry.employee_id, [])
      }
      entriesByEmployee.get(entry.employee_id)?.push(entry)
    })

    // Generate report for each employee
    const reports: WeeklyTimeEntryReport[] = []
    entriesByEmployee.forEach((entries, employeeId) => {
      if (entries.length === 0) return

      const firstEntry = entries[0]
      const crewInfo = crewMap.get(employeeId) || { email: '', name: firstEntry.employee_name }

      const dailyEntries = new Map<string, any>()
      let totalHours = 0
      let regularHours = 0
      let overtimeHours = 0
      let breakHours = 0
      let daysWorked = 0

      entries.forEach((entry: any) => {
        const date = entry.clock_in_time?.split('T')[0]
        if (!date) return

        if (!dailyEntries.has(date)) {
          dailyEntries.set(date, [])
          daysWorked++
        }
        dailyEntries.get(date)?.push(entry)

        const hours = entry.total_hours || 0
        const breaks = entry.break_hours || 0

        totalHours += hours
        breakHours += breaks
      })

      // Calculate weekly overtime: hours over 40 in the week
      const weeklyOvertimeHours = Math.max(0, totalHours - 40)
      regularHours = Math.min(totalHours, 40) // First 40 hours are regular

      // Build daily entries report (distributing overtime from bottom to top)
      const reportEntries: WeeklyTimeEntryReport['entries'] = []
      let cumulativeHours = 0

      dailyEntries.forEach((dayEntries, date) => {
        let dayTotalHours = 0
        let dayBreakHours = 0
        const sites = new Set<string>()

        dayEntries.forEach((entry: any) => {
          dayTotalHours += entry.total_hours || 0
          dayBreakHours += entry.break_hours || 0
          sites.add(entry.site_name)
        })

        // Determine how many of these hours are regular vs overtime
        const dayRegularHours = Math.min(dayTotalHours, Math.max(0, 40 - cumulativeHours))
        const dayOvertimeHours = dayTotalHours - dayRegularHours

        reportEntries.push({
          date,
          site_name: Array.from(sites).join(', '),
          clock_in: dayEntries[0]?.clock_in_time?.split('T')[1]?.slice(0, 5) || '',
          clock_out: dayEntries[dayEntries.length - 1]?.clock_out_time?.split('T')[1]?.slice(0, 5) || '',
          total_hours: parseFloat(dayTotalHours.toFixed(2)),
          break_hours: parseFloat(dayBreakHours.toFixed(2)),
          regular_hours: parseFloat(dayRegularHours.toFixed(2)),
          overtime_hours: parseFloat(dayOvertimeHours.toFixed(2)),
        })

        cumulativeHours += dayTotalHours
      })

      reports.push({
        employee_id: employeeId,
        employee_name: crewInfo.name,
        employee_email: crewInfo.email,
        week_start: startDate,
        week_end: endDate,
        entries: reportEntries,
        weekly_totals: {
          total_hours: parseFloat(totalHours.toFixed(2)),
          regular_hours: parseFloat(regularHours.toFixed(2)),
          overtime_hours: parseFloat(weeklyOvertimeHours.toFixed(2)),
          break_hours: parseFloat(breakHours.toFixed(2)),
          days_worked: daysWorked,
        },
      })
    })

    return reports.sort((a, b) => a.employee_name.localeCompare(b.employee_name))
  } catch (err) {
    console.error('[Supabase] Failed to get weekly time entries report:', err)
    return []
  }
}
