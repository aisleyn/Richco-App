import type { CrewMember } from '../types'
import {
  addCrewMember as supabaseAddCrewMember,
  getCrewMemberByEmail as supabaseGetCrewMemberByEmail,
  getAllCrewMembers,
  updateCrewMember as supabaseUpdateCrewMember,
} from './supabase'
import { deleteCrewMember as authDeleteCrewMember, supabase } from './supabaseAuth'

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

export interface Qualification {
  name: string
  expiryDate?: string
  issueDate?: string
  url?: string
  id?: string
  uploadedDate?: number
}

export interface EmploymentFile {
  id: string
  name: string
  type: 'contract' | 'offer_letter' | 'agreement' | 'nda' | 'other'
  uploadedDate: number
  url?: string
}

export interface LeaveData {
  annualAllowance: number
  used: number
  approved: number
  pending: number
}

export interface StoredCrewMember extends Omit<CrewMember, 'status'> {
  id: number
  email: string
  isAdmin: boolean
  status: 'available' | 'onsite' | 'enroute' | 'off' | string
  hourlyRate?: number
  salary?: number
  paymentType?: 'hourly' | 'salary'
  hireDate?: string
  identification?: {
    type: 'passport' | 'drivers_license' | 'other'
    url: string
    uploadedDate: number
  }
  emergencyContact?: EmergencyContact
  qualifications?: Qualification[]
  employmentFiles?: EmploymentFile[]
  leaveData?: LeaveData
}

export function initializeCrew() {
  console.log('[Crew] Initialized (using Supabase backend)')
}

export async function getAllCrew(): Promise<StoredCrewMember[]> {
  const members = await getAllCrewMembers()
  return members.map(m => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    role: m.role,
    roleLabel: `${m.firstName} ${m.lastName}`,
    phone: m.phone || '',
    status: m.status || 'available',
    isAdmin: m.isAdmin || false,
  }))
}

export async function getCrewMemberByEmail(email: string): Promise<StoredCrewMember | undefined> {
  const member = await supabaseGetCrewMemberByEmail(email)
  if (!member) return undefined

  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    role: member.role,
    roleLabel: `${member.firstName} ${member.lastName}`,
    phone: member.phone || '',
    status: member.status || 'available',
    isAdmin: member.isAdmin || false,
  }
}

export async function isUserAdmin(email: string): Promise<boolean> {
  const member = await getCrewMemberByEmail(email)
  return member?.isAdmin ?? false
}

export async function addCrewMember(data: {
  firstName: string
  lastName: string
  email: string
  role?: 'site_employee' | 'office_staff' | 'leadership'
  phone?: string
  isAdmin?: boolean
}): Promise<StoredCrewMember> {
  // Check if email already exists
  const existing = await getCrewMemberByEmail(data.email)
  if (existing) {
    throw new Error('Employee with this email already exists')
  }

  const result = await supabaseAddCrewMember({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: data.role || 'site_employee',
    phone: data.phone,
    isAdmin: data.isAdmin,
  })

  if (!result) {
    throw new Error('Failed to create crew member in Supabase')
  }

  console.log('[Crew] Added crew member:', result.email, 'ID:', result.id)

  return {
    id: result.id,
    firstName: result.firstName,
    lastName: result.lastName,
    email: result.email,
    role: result.role,
    roleLabel: `${result.firstName} ${result.lastName}`,
    phone: result.phone || '',
    status: result.status || 'available',
    isAdmin: result.isAdmin || false,
  }
}

export async function updateCrewMember(
  email: string,
  updates: Partial<Omit<StoredCrewMember, 'id' | 'email'>>
): Promise<StoredCrewMember | null> {
  const updatePayload: any = {}
  if (updates.firstName) updatePayload.firstName = updates.firstName
  if (updates.lastName) updatePayload.lastName = updates.lastName
  if (updates.phone) updatePayload.phone = updates.phone
  if (updates.role) updatePayload.role = updates.role
  if (updates.status) updatePayload.status = updates.status
  if (updates.isAdmin !== undefined) updatePayload.isAdmin = updates.isAdmin

  const result = await supabaseUpdateCrewMember(email, updatePayload)
  if (!result) return null

  console.log('[Crew] Updated crew member:', email)

  return {
    id: result.id,
    firstName: result.firstName,
    lastName: result.lastName,
    email: result.email,
    role: result.role,
    roleLabel: `${result.firstName} ${result.lastName}`,
    phone: result.phone || '',
    status: result.status || 'available',
    isAdmin: result.isAdmin || false,
  }
}

export async function setAdminStatus(email: string, isAdmin: boolean): Promise<StoredCrewMember | null> {
  return updateCrewMember(email, { isAdmin })
}

export async function ensureCrewMemberExists(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<StoredCrewMember> {
  const existing = await getCrewMemberByEmail(email)
  if (existing) return existing

  return addCrewMember({
    firstName: firstName || email.split('@')[0],
    lastName: lastName || 'User',
    email,
    role: 'site_employee',
  })
}

export async function hasUserCompletedRegistration(email: string): Promise<boolean> {
  const member = await getCrewMemberByEmail(email)
  return member !== undefined
}

// Remove a crew member completely - deletes from all tables and data
export async function removeCrewMember(email: string): Promise<boolean> {
  try {
    console.log('[Crew] Starting removal process for:', email)

    // First try to get user_id from users table by email
    let userId: string | null = null
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (userError) {
      console.warn('[Crew] Error querying users table:', userError.message)
    }

    if (userData?.id) {
      userId = userData.id
      console.log('[Crew] Found user_id in users table:', userId)
    } else {
      console.warn('[Crew] User not found in users table, will proceed with email-based cleanup')
    }

    // Clean up all related data regardless of whether user is in users table
    // This ensures complete removal from the system
    console.log('[Crew] Starting data cleanup for:', email)
    await cleanupUserData(email, userId)

    // Delete from crew_members table first (by email)
    console.log('[Crew] Deleting from crew_members table:', email)
    const { error: crewError } = await supabase
      .from('crew_members')
      .delete()
      .eq('email', email)

    if (crewError) {
      console.error('[Crew] ❌ Error deleting from crew_members:', crewError.message)
      return false
    }
    console.log('[Crew] ✅ Successfully deleted from crew_members table:', email)

    // Always delete from users table (RLS might prevent read but not delete)
    if (userId) {
      console.log('[Crew] Deleting from users table:', userId)
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (usersError) {
        console.error('[Crew] ❌ Error deleting from users table:', usersError.message)
        // Don't fail here - crew_members is what matters for the UI
      } else {
        console.log('[Crew] ✅ Successfully deleted from users table:', userId)
      }
    }

    // If we have userId, also use the auth deletion process
    if (userId) {
      console.log('[Crew] Calling auth deletion for userId:', userId)
      const result = await authDeleteCrewMember(userId)
      if (result.success) {
        console.log('[Crew] ✅ Auth deletion successful:', email)
      } else {
        console.warn('[Crew] ⚠️ Auth deletion failed (continuing anyway):', result.message)
      }
    }

    console.log('[Crew] ✅✅ CREW MEMBER FULLY REMOVED:', email)
    return true
  } catch (err) {
    console.error('[Crew] ❌ Exception during removal:', err)
    return false
  }
}

// Helper function to clean up all user-related data
async function cleanupUserData(email: string, userId: string | null): Promise<void> {
  try {
    console.log('[Crew] Cleaning up all related data for:', email, userId ? `(${userId})` : '')

    if (!userId) {
      console.warn('[Crew] ⚠️ No userId provided - skipping user_id-based deletions')
    }

    // Delete time entries (timesheets)
    if (userId) {
      const { error: timeErr } = await supabase.from('time_entries').delete().eq('user_id', userId)
      if (timeErr) {
        console.warn('[Crew] Warning deleting time entries:', timeErr.message)
      } else {
        console.log('[Crew] ✅ Deleted time entries')
      }

      // Delete break periods
      const { error: breakErr } = await supabase.from('break_periods').delete().eq('user_id', userId)
      if (breakErr) {
        console.warn('[Crew] Warning deleting break periods:', breakErr.message)
      } else {
        console.log('[Crew] ✅ Deleted break periods')
      }

      // Delete shift assignments
      const { error: shiftErr } = await supabase.from('shift_assignments').delete().eq('crew_member_id', userId)
      if (shiftErr) {
        console.warn('[Crew] Warning deleting shift assignments:', shiftErr.message)
      } else {
        console.log('[Crew] ✅ Deleted shift assignments')
      }

      // Delete photos uploaded by this user
      const { error: photoErr } = await supabase.from('photos').delete().eq('submitted_by_id', userId)
      if (photoErr) {
        console.warn('[Crew] Warning deleting photos:', photoErr.message)
      } else {
        console.log('[Crew] ✅ Deleted photos')
      }

      // Delete messages from this user
      const { error: msgErr } = await supabase.from('messages').delete().eq('sender_id', userId)
      if (msgErr) {
        console.warn('[Crew] Warning deleting messages:', msgErr.message)
      } else {
        console.log('[Crew] ✅ Deleted messages')
      }

      // Delete employee documents
      const { error: docErr } = await supabase.from('employee_documents').delete().eq('crew_member_email', email)
      if (docErr) {
        console.warn('[Crew] Warning deleting employee documents:', docErr.message)
      } else {
        console.log('[Crew] ✅ Deleted employee documents')
      }
    }

    console.log('[Crew] ✅ Data cleanup completed for:', email)
  } catch (err) {
    console.error('[Crew] Exception during data cleanup:', err)
    // Don't throw - continue with deletion even if cleanup partially fails
  }
}

// Stub for backwards compatibility - clearing all crew should be done carefully
export async function clearAllCrew(): Promise<void> {
  console.warn('[Crew] clearAllCrew not implemented for Supabase backend')
}

/**
 * Sync users table with crew_members table
 * Automatically creates crew member entries for registered users without one
 * This ensures newly registered users show up in the employee hub immediately
 */
export async function syncRegisteredUsersWithCrew(): Promise<{ synced: number; errors: number }> {
  try {
    console.log('[Crew] 🔄 Starting sync of registered users with crew_members...')

    // Get all users from the users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, name, role')
      .eq('role', 'crew')

    if (usersError) {
      console.error('[Crew] Error fetching users:', usersError.message)
      return { synced: 0, errors: 1 }
    }

    if (!users || users.length === 0) {
      console.log('[Crew] ✅ No users to sync')
      return { synced: 0, errors: 0 }
    }

    console.log(`[Crew] Found ${users.length} registered crew users to check`)

    let synced = 0
    let errors = 0

    // Check each user and create crew member if missing
    for (const user of users) {
      try {
        // Check if crew member exists for this email
        const existing = await getCrewMemberByEmail(user.email)

        if (!existing) {
          // User registered but doesn't have a crew member entry — create it
          console.log('[Crew] 🔄 Creating missing crew member for:', user.email)

          const firstName = (user.first_name as string) || user.name?.split(' ')[0] || user.email.split('@')[0]
          const lastName = (user.last_name as string) || user.name?.split(' ')[1] || 'User'

          const result = await addCrewMember({
            firstName,
            lastName,
            email: user.email,
            role: 'site_employee',
          })

          if (result) {
            console.log('[Crew] ✅ Synced user to crew member:', user.email)
            synced++
          }
        }
      } catch (err) {
        console.error('[Crew] Error syncing user:', user.email, err)
        errors++
      }
    }

    console.log(`[Crew] ✅ Sync complete: ${synced} users synced, ${errors} errors`)
    return { synced, errors }
  } catch (err) {
    console.error('[Crew] Exception during sync:', err)
    return { synced: 0, errors: 1 }
  }
}
