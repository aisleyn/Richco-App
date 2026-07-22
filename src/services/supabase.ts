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
